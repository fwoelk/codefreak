import React, { useCallback, useState } from 'react'
import { useUploadTasksMutation } from '../services/codefreak-api'
import { Alert, Button, Icon, Modal, Spin, Upload } from 'antd'
import { RcFile } from 'antd/lib/upload/interface'

const { Dragger } = Upload

interface UploadTasksButtonProps {
  onUploadCompleted: (tasks: { id: string }[]) => void
}

const UploadTasksButton = (props: UploadTasksButtonProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const showModal = () => setModalVisible(true)
  const hideModal = () => setModalVisible(false)

  const [uploadTasks, { loading: uploading }] = useUploadTasksMutation()

  const onUploadCompleted = props.onUploadCompleted

  const onUpload = useCallback(
    (files: File[]) => {
      uploadTasks({ variables: { files } }).then(r => {
        hideModal()
        if (r.data) {
          onUploadCompleted(
            r.data.uploadTasks.map(task => {
              return {
                id: task.id
              }
            })
          )
        }
      })
    },
    [onUploadCompleted, uploadTasks]
  )

  const beforeUpload = useCallback(
    (file: RcFile, fileList: RcFile[]) => {
      // this function is called for every file, but the upload of the whole file list should run only once
      if (fileList.indexOf(file) === 0) {
        onUpload(fileList)
      }

      return false
    },
    [onUpload]
  )

  return (
    <>
      <Button icon="upload" type="default" onClick={showModal}>
        Import Tasks
      </Button>
      <Modal
        visible={modalVisible}
        onCancel={hideModal}
        title="Import tasks"
        footer={[
          <Button type="default" onClick={hideModal} key="cancel">
            Cancel
          </Button>
        ]}
      >
        <Alert
          message="This action will create the imported tasks as new tasks and will not alter or delete existing tasks."
          style={{ marginBottom: 16, marginTop: 16 }}
        />
        <Dragger
          accept=".tar,.tar.gz,.zip"
          height={170}
          multiple
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            {uploading ? <Spin size="large" /> : <Icon type="inbox" />}
          </p>
          <p className="ant-upload-text">
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint">
            The individual tasks should be .zip, .tar or .tar.gz archives. You
            can also upload a single archive containing the tasks (as archives).
          </p>
        </Dragger>
      </Modal>
    </>
  )
}

export default UploadTasksButton
