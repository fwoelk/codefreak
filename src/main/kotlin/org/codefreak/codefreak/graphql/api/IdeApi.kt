package org.codefreak.codefreak.graphql.api

import com.expediagroup.graphql.spring.operations.Mutation
import org.codefreak.codefreak.auth.Authority
import org.codefreak.codefreak.auth.Authorization
import org.codefreak.codefreak.entity.AssignmentStatus
import org.codefreak.codefreak.graphql.BaseResolver
import org.codefreak.codefreak.service.AnswerService
import org.codefreak.codefreak.service.ContainerService
import org.codefreak.codefreak.service.TaskService
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Component
class IdeMutation : BaseResolver(), Mutation {

  @Transactional
  fun startIde(type: String, id: UUID): String = context {
    when (type) {
      "answer" -> {
        val answer = serviceAccess.getService(AnswerService::class).findAnswer(id)
        var readOnly = true
        if (Authorization().isCurrentUser(answer.submission.user)) {
          readOnly = answer.task.assignment?.status != AssignmentStatus.OPEN
        } else {
          Authorization().requireAuthority(Authority.ROLE_TEACHER)
        }
        serviceAccess.getService(ContainerService::class).startIdeContainer(answer, readOnly)
      }
      "task" -> {
        val task = serviceAccess.getService(TaskService::class).findTask(id)
        require(task.isEditable(authorization))
        serviceAccess.getService(ContainerService::class).startIdeContainer(task)
      }
      else -> throw IllegalArgumentException("Unknown type")
    }
  }
}
