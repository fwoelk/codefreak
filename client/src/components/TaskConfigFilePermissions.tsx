import {Alert, Col, List, Row, Tooltip} from "antd";
import {InfoCircleFilled} from "@ant-design/icons";
import JsonSchemaEditButton from "./JsonSchemaEditButton";
import {JSONSchema6} from "json-schema";
import {TaskDetailsInput, useGetTaskDetailsQuery, useUpdateTaskDetailsMutation} from "../generated/graphql";
import AsyncPlaceholder from "./AsyncContainer";
import {makeUpdater} from "../services/util";
import useIdParam from "../hooks/useIdParam";
import {messageService} from "../services/message";

const TaskConfigFilePermissions : React.FC<{ editable: boolean }> = ({ editable }) => {

  const result = useGetTaskDetailsQuery({
    variables: { id: useIdParam(), teacher: editable }
  })

  if (result.data === undefined) {
    return <AsyncPlaceholder result={result} />
  }

  const { task } = result.data

  const [updateMutation] = useUpdateTaskDetailsMutation({
    onCompleted: () => {
      result.refetch()
      messageService.success('Task updated')
    }
  })

  // hiddenFiles and protectedFiles are null if task is not editable
  if (!task.hiddenFiles || !task.protectedFiles) {
    return <></>
  }

  const taskDetailsInput: TaskDetailsInput = {
    id: task.id,
    body: task.body,
    hiddenFiles: task.hiddenFiles,
    protectedFiles: task.protectedFiles,
    ideEnabled: task.ideEnabled,
    ideImage: task.ideImage,
    ideArguments: task.ideArguments
  }

  const updater = makeUpdater(taskDetailsInput, input =>
    updateMutation({ variables: { input } })
  )

  const renderFilePattern = (pattern: string) => (
    <List.Item>
      <code>{pattern}</code>
    </List.Item>
  )

  const filePatternSchema: JSONSchema6 = {
    type: 'array',
    items: { type: 'string' }
  }

  const filePatternHelp = (
    <Alert
      style={{ marginBottom: 16 }}
      message={
        <>
          File patterns use the Ant pattern syntax. For more information refer to
          the{' '}
          <a
            href="https://ant.apache.org/manual/dirtasks.html#patterns"
            target="_blank"
            rel="noopener noreferrer"
          >
            official documentation
          </a>
          .
        </>
      }
      type="info"
    />
  )

  return (
    <Row gutter={16}>
      <Col span={12}>
        <List
          size="small"
          header={
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
                    <span>
                      <b>Hidden files</b>{' '}
                      <Tooltip
                        title={
                          'Patterns of files that should be hidden from students. Matching files are only included for evaluation. If matching files are created by students, they are ignored for evaluation.'
                        }
                        placement="bottom"
                      >
                        <InfoCircleFilled />
                      </Tooltip>
                    </span>
              <JsonSchemaEditButton
                title="Edit hidden files"
                extraContent={filePatternHelp}
                schema={filePatternSchema}
                value={task.hiddenFiles}
                onSubmit={updater('hiddenFiles')}
              />
            </div>
          }
          bordered
          dataSource={task.hiddenFiles}
          renderItem={renderFilePattern}
        />
      </Col>
      <Col span={12}>
        <List
          size="small"
          header={
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
                    <span>
                      <b>Protected files</b>{' '}
                      <Tooltip
                        title={
                          'Patterns of files that should be read-only. Students will be able to see matching files but modifications are ignored for evaluation. Non-existent files can be protected to prevent their creation.'
                        }
                        placement="bottom"
                      >
                        <InfoCircleFilled />
                      </Tooltip>
                    </span>
              <JsonSchemaEditButton
                title="Edit protected files"
                extraContent={filePatternHelp}
                schema={filePatternSchema}
                value={task.protectedFiles}
                onSubmit={updater('protectedFiles')}
              />
            </div>
          }
          bordered
          dataSource={task.protectedFiles}
          renderItem={renderFilePattern}
        />
      </Col>
    </Row>
  )
}

export default TaskConfigFilePermissions
