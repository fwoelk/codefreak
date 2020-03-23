import React from 'react'
import { Assignment } from '../services/codefreak-api'

const AssignmentStatus: React.FC<{
  assignment: Pick<Assignment, 'status' | 'deadline' | 'openFrom'>
}> = props => {
  const { status } = props.assignment
  switch (status) {
    case 'INACTIVE':
      return <>Inactive (only you can see this)</>
    case 'OPEN':
      return <>Open for submissions</>
    case 'CLOSED':
      return <>Closed</>
    case 'ACTIVE':
      return <>Not open for submissions yet</>
  }
  return <>Unknown</>
}

export default AssignmentStatus
