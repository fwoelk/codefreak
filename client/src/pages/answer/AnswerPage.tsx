import {
  DownCircleOutlined,
  ExclamationCircleTwoTone,
  UpCircleOutlined
} from '@ant-design/icons'
import { Alert, Button, Card, Col, Modal, Row } from 'antd'
import moment from 'moment'
import { useCallback, useContext, useState } from 'react'
import ArchiveDownload from '../../components/ArchiveDownload'
import AsyncPlaceholder from '../../components/AsyncContainer'
import useMomentReached from '../../hooks/useMomentReached'
import { useServerNow } from '../../hooks/useServerTimeOffset'
import {
  Answer,
  FileType,
  Submission,
  useGetAnswerFileListQuery,
  useGetAnswerQuery,
  useResetAnswerMutation
} from '../../services/codefreak-api'
import { messageService } from '../../services/message'
import { displayName } from '../../services/user'
import { DifferentUserContext } from '../task/TaskPage'
import FileManager, { FileManagerNode } from '../../components/file-manager'
import { dirname } from 'path'

type AnswerWithSubmissionDeadline = Pick<Answer, 'id'> & {
  submission: Pick<Submission, 'deadline'>
}

interface DangerZoneProps {
  answer: AnswerWithSubmissionDeadline
  onReset?: () => void
}

const DangerZone: React.FC<DangerZoneProps> = props => {
  const { id } = props.answer
  const { deadline } = props.answer.submission
  const [resetAnswer, { loading: resetLoading }] = useResetAnswerMutation({
    variables: { id }
  })
  const [showDangerZone, setShowDangerZone] = useState<boolean>(false)
  const toggleDangerZone = useCallback(() => {
    setShowDangerZone(!showDangerZone)
  }, [showDangerZone, setShowDangerZone])
  const serverNow = useServerNow()
  const deadlineReached = useMomentReached(
    deadline ? moment(deadline) : undefined,
    serverNow
  )

  if (deadlineReached === true) {
    return null
  }

  const onResetClick = () => {
    Modal.confirm({
      title: 'Really reset files?',
      icon: <ExclamationCircleTwoTone twoToneColor="#ff4d4f" />,
      okType: 'danger',
      content: (
        <>
          This will REMOVE all modifications you made!
          <br />
          Are you sure?
        </>
      ),
      onOk: () =>
        resetAnswer().then(() => {
          messageService.success('Answer has been reset to initial files!')
          if (props.onReset) {
            props.onReset()
          }
        })
    })
  }

  const upCircle = <UpCircleOutlined />
  const downCircle = <DownCircleOutlined />

  return (
    <Card
      title="Danger Zone"
      extra={
        <Button
          icon={showDangerZone ? upCircle : downCircle}
          onClick={toggleDangerZone}
        >
          {showDangerZone ? 'Hide' : 'Show'}
        </Button>
      }
      bodyStyle={{ display: `${showDangerZone ? '' : 'none'}` }}
    >
      <Row>
        <Col xl={12}>
          <h3>Reset answer</h3>
          <Alert
            type="error"
            style={{ marginBottom: 16 }}
            message={
              <>
                This will remove all your work on this task and replace
                everything with the initial files from your teacher!
                <br />
                <strong>You cannot revert this action!</strong>
              </>
            }
          />
          <Button danger onClick={onResetClick} loading={resetLoading}>
            Reset all files
          </Button>
        </Col>
      </Row>
    </Card>
  )
}

const AnswerPage: React.FC<{ answerId: string }> = props => {
  const result = useGetAnswerQuery({
    variables: { id: props.answerId }
  })
  const differentUser = useContext(DifferentUserContext)
  const { data: files } = useGetAnswerFileListQuery({
    variables: { id: props.answerId }
  })
  const [reloadFiles] = useState<() => void>(() => {
    return () => undefined
  })

  if (files === undefined || result.data === undefined) {
    return <AsyncPlaceholder result={result} />
  }

  const { answer } = result.data

  const filesTitle = differentUser
    ? `Files uploaded by ${displayName(differentUser)}`
    : 'Your current submission'

  interface TFile extends FileManagerNode {
    size: number
  }

  const getFiles: (prefix: string) => Promise<TFile[]> = prefix => {
    const normalizePath = (path: string) => '/' + path.replace(/^\/*|\/$/g, '')
    const normalizedPrefix = normalizePath(prefix)
    const f = files.answerFiles
      .filter(file => {
        const filePath = normalizePath(file.path)
        const fileDir = dirname(filePath)
        return normalizedPrefix === fileDir && normalizedPrefix !== filePath
      })
      .map(
        (file): TFile => ({
          path: file.path,
          type: file.type === FileType.Directory ? 'directory' : 'file',
          size: 0
        })
      )
    return Promise.resolve(f)
  }

  return (
    <>
      <Card
        title={filesTitle}
        style={{ marginBottom: '16px' }}
        extra={
          <ArchiveDownload url={answer.sourceUrl}>
            Download source code
          </ArchiveDownload>
        }
      >
        <FileManager getNodes={getFiles} />
      </Card>
      {!differentUser && <DangerZone answer={answer} onReset={reloadFiles} />}
    </>
  )
}

export default AnswerPage
