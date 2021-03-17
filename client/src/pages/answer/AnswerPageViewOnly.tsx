import { Alert, Card } from 'antd'
import { useContext } from 'react'
import AnswerFileBrowser from '../../components/AnswerFileBrowser'
import ArchiveDownload from '../../components/ArchiveDownload'
import AsyncPlaceholder from '../../components/AsyncContainer'
import {
  useGetAnswerQuery,
} from '../../services/codefreak-api'
import { displayName } from '../../services/user'
import { DifferentUserContext } from '../task/TaskPage'


const AnswerPageViewOnly: React.FC<{ answerId: string, onFilesChange: any }> = props => {
  const result = useGetAnswerQuery({
    variables: { id: props.answerId }
  })
  const differentUser = useContext(DifferentUserContext)
  const onFileTreeReady = props.onFilesChange

  if (result.data === undefined) {
    return <AsyncPlaceholder result={result} />
  }

  const { answer } = result.data

  const filesTitle = differentUser
    ? `Files uploaded by ${displayName(differentUser)}`
    : 'Your current submission'

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
        {differentUser && (
          <Alert
            showIcon
            message="You can add comments inside code by clicking the + symbol next to the line numbers!"
            style={{ marginBottom: 16 }}
          />
        )}
        <AnswerFileBrowser
          answerId={answer.id}
          review={!!differentUser}
          onReady={onFileTreeReady}
        />
      </Card>
    </>
  )
}

export default AnswerPageViewOnly
