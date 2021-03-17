import {
  ExclamationCircleTwoTone,
  UpCircleOutlined,
  DownCircleOutlined
} from '@ant-design/icons'
import { Alert, Button, Card, Col, Modal, Row } from 'antd'
import moment from 'moment'
import { useCallback, useContext, useEffect, useState } from 'react'
import AnswerBlocker from '../../components/AnswerBlocker'
import AsyncPlaceholder from '../../components/AsyncContainer'
import FileImport from '../../components/FileImport'
import useMomentReached from '../../hooks/useMomentReached'
import { useServerNow } from '../../hooks/useServerTimeOffset'
import {
  Answer,
  Submission,
  useGetAnswerQuery,
  useImportAnswerSourceMutation,
  useResetAnswerMutation,
  useUploadAnswerSourceMutation
} from '../../services/codefreak-api'
import { messageService } from '../../services/message'
import { DifferentUserContext } from '../task/TaskPage'
import AnswerPageViewOnly from "./AnswerPageViewOnly";

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

interface UploadAnswerProps {
  answer: AnswerWithSubmissionDeadline
  onUpload?: () => void
}

const UploadAnswer: React.FC<UploadAnswerProps> = props => {
  const { id } = props.answer
  const { deadline } = props.answer.submission
  const [
    uploadSource,
    { loading: uploading, data: uploadSuccess }
  ] = useUploadAnswerSourceMutation()

  const [
    importSource,
    { loading: importing, data: importSucess }
  ] = useImportAnswerSourceMutation()

  const onUpload = (files: File[]) =>
    uploadSource({ variables: { files, id } }).then(() => {
      if (props.onUpload) {
        props.onUpload()
      }
    })

  const onImport = (url: string) => importSource({ variables: { url, id } })

  useEffect(() => {
    if (uploadSuccess || importSucess) {
      messageService.success('Source code submitted successfully')
    }
  }, [uploadSuccess, importSucess])

  return (
    <Card title="Upload Source Code" style={{ marginBottom: '16px' }}>
      <AnswerBlocker deadline={deadline ? moment(deadline) : undefined}>
        <FileImport
          uploading={uploading}
          onUpload={onUpload}
          onImport={onImport}
          importing={importing}
        />
      </AnswerBlocker>
    </Card>
  )
}

const AnswerPageEditable: React.FC<{ answerId: string }> = props => {
  const result = useGetAnswerQuery({
    variables: { id: props.answerId }
  })
  const differentUser = useContext(DifferentUserContext)
  const [reloadFiles, setReloadFiles] = useState<() => void>(() => {
    return () => undefined
  })

  if (result.data === undefined) {
    return <AsyncPlaceholder result={result} />
  }

  const { answer } = result.data

  // if we want to store a function in state we have to wrap it in another callback
  // otherwise React will execute the function
  const onFileTreeReady = (reload: () => void) => setReloadFiles(() => reload)

  return (
    <>
      <AnswerPageViewOnly answerId={props.answerId} onFilesChange={onFileTreeReady}/>
      {!differentUser && (
        <>
          <UploadAnswer answer={answer} onUpload={reloadFiles} />
          <DangerZone answer={answer} onReset={reloadFiles} />
        </>
      )}
    </>
  )
}

export default AnswerPageEditable
