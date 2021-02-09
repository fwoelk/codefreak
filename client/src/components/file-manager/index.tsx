import React, {
  HTMLProps,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { Button, Checkbox, Dropdown, Menu, Table } from 'antd'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
  EllipsisOutlined,
  FileFilled,
  FolderFilled,
  HomeFilled,
  PlusCircleOutlined
} from '@ant-design/icons'
import { basename } from 'path'
import { ColumnsType } from 'antd/es/table'
import { union, without } from 'react-dnd-html5-backend/lib/utils/js_utils'
import { DropdownButtonProps } from 'antd/lib/dropdown'

import './index.less'

export interface FileManagerNode {
  path: string
  type: 'file' | 'directory'
}

export interface Column<T> {
  key: string
  title: React.ReactNode
  dataIndex?: string | number
  render?: (value: any, record: T, index: number) => React.ReactNode
}

/**
 * TODO:
 * 1. Actions ggf. außerhalb definieren?
 * 2. nodes reingeben? -> dann muss aktueller Pfad auch außerhalb kontrolliert werden
 */
export interface FileManagerProps<T extends FileManagerNode> {
  additionalColumns?: Column<T>[]
  getNodes: (path: string) => Promise<T[]>
  onMove?: (from: string, to: string) => Promise<void>
  // onRename?: (from: string, to: string) => Promise<void>
  // onCreate?: (node: FileManagerNode, content?: Blob) => Promise<void>
  // onCopy?: (node: T, target: T) => Promise<void>
  // onDelete?: (node: T) => Promise<void>
  onClick?: (node: T) => void
  // getIcon?: (node: T) => React.ReactNode | undefined
}

interface AdditionalRowRenderProps<T> extends HTMLProps<HTMLTableRowElement> {
  record: T
  onMove: (target: T) => void
}

const FileManagerRow = <T extends FileManagerNode>(
  props: PropsWithChildren<AdditionalRowRenderProps<T>>
) => {
  const { style, record, onMove, ...restProps } = props
  const ref = useRef<HTMLTableRowElement>(null)
  const [, drop] = useDrop({
    accept: ['directory', 'file'],
    drop: () => {
      onMove(record)
    },
    canDrop: (item: FileManagerNode) => {
      return item.path !== record.path
    }
  })
  const [, drag] = useDrag({ item: record })
  if (record.type === 'directory') {
    drag(drop(ref))
  } else {
    drag(ref)
  }
  return <tr ref={ref} style={{ cursor: 'pointer', ...style }} {...restProps} />
}

const defaultIconRenderer = (_: string) => {
  return <FileFilled style={{ fontSize: '24px' }} />
}

const renderDropdown = (additionalProps?: Partial<DropdownButtonProps>) => {
  const menu = (
    <Menu>
      <Menu.Item key="delete">Delete</Menu.Item>
      <Menu.Item key="rename">Rename</Menu.Item>
      <Menu.Item key="copy">Copy</Menu.Item>
      <Menu.Item key="download">Download</Menu.Item>
    </Menu>
  )

  return (
    <Dropdown
      {...(additionalProps || {})}
      trigger={['click']}
      overlay={menu}
      placement="bottomRight"
    >
      <Button
        className="action-dropdown"
        size="small"
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
        }}
        icon={<EllipsisOutlined />}
      />
    </Dropdown>
  )
}

const FileManager = <T extends FileManagerNode>(
  props: PropsWithChildren<FileManagerProps<T>>
) => {
  const { getNodes, additionalColumns } = props
  const [currentPath, setCurrentPath] = useState<string>('/')
  const [nodes, setNodes] = useState<T[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])

  const selectAll = useCallback(
    () => setSelectedPaths(nodes.map(n => n.path)),
    [setSelectedPaths, nodes]
  )
  const unselectAll = useCallback(() => setSelectedPaths([]), [
    setSelectedPaths
  ])
  const allSelected = selectedPaths.length === nodes.length

  useEffect(() => {
    setLoading(true)
    getNodes(currentPath).then(newNodes => {
      setNodes(newNodes)
      setLoading(false)
    })
  }, [getNodes, setLoading, setNodes, currentPath])

  const columns: ColumnsType<T> = useMemo(
    () => [
      {
        key: 'icon',
        title: <PlusCircleOutlined style={{ fontSize: '24px' }} />,
        render: (_: any, node: T) => {
          if (node.type === 'directory') {
            return <FolderFilled style={{ fontSize: '24px' }} />
          }
          return defaultIconRenderer(basename(node.path))
        },
        width: '60px'
      },
      {
        key: 'name',
        title: 'Name',
        sorter: (a, b) => a.path.localeCompare(b.path),
        defaultSortOrder: 'ascend',
        render: (_: any, node: T) => node.path
      },
      ...(additionalColumns || []),
      {
        key: 'select',
        title: (
          <Checkbox
            checked={allSelected}
            onClick={() => {
              if (!allSelected) {
                selectAll()
              } else {
                unselectAll()
              }
            }}
          />
        ),
        render: (_: any, node: T) => (
          <Checkbox
            checked={selectedPaths.indexOf(node.path) !== -1}
            onClick={e => {
              e.stopPropagation()
              if (selectedPaths.indexOf(node.path) !== -1) {
                setSelectedPaths(without(selectedPaths, node.path))
              } else {
                setSelectedPaths(union([node.path], selectedPaths))
              }
            }}
          />
        ),
        width: '0'
      },
      {
        key: 'actions',
        title: () =>
          renderDropdown({
            className: selectedPaths.length
              ? 'action-dropdown-all available'
              : 'action-dropdown-all'
          }),
        render: () =>
          renderDropdown({
            className: 'action-dropdown'
          }),
        width: '0'
      }
    ],
    [
      additionalColumns,
      selectedPaths,
      setSelectedPaths,
      allSelected,
      selectAll,
      unselectAll
    ]
  )

  if (loading || nodes.length === 0) {
    return <>Loading…</>
  }

  const renderPathBreadcrumb = () => {
    const createSetPath = (path: string) => () => setCurrentPath(path)
    const items = [
      <Button
        type="link"
        key="/"
        onClick={createSetPath('/')}
        icon={<HomeFilled />}
      />
    ]
    const parts = currentPath.split('/').filter(path => path !== '')
    for (let i = 1; i <= parts.length; i++) {
      const path = '/' + parts.slice(0, i).join('/')
      items.push(<span key={'sep-' + i}>/</span>)
      items.push(
        <Button type="link" key={path} onClick={createSetPath(path)}>
          {basename(path)}
        </Button>
      )
    }
    return items
  }

  const additionalRowProps = (record: T) => {
    const isSelected = selectedPaths.indexOf(record.path) !== -1
    return {
      record,
      onClick: () => {
        if (record.type === 'directory') {
          setSelectedPaths([])
          setCurrentPath('/' + record.path)
        } else if (props.onClick) {
          props.onClick(record)
        }
      },
      className: isSelected ? 'selected-row' : '',
      onMove: target => {
        if (props.onMove) {
          props.onMove(record.path, target.path)
        }
      }
    } as AdditionalRowRenderProps<T>
  }

  return (
    <div>
      <p>Content of: {renderPathBreadcrumb()}</p>
      <DndProvider backend={HTML5Backend}>
        <Table
          className="file-manager-table"
          dataSource={nodes}
          columns={columns}
          pagination={false}
          rowKey="path"
          components={{
            body: {
              row: FileManagerRow
            }
          }}
          onRow={additionalRowProps}
        />
      </DndProvider>
    </div>
  )
}

export default FileManager
