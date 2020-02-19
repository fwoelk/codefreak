package de.code_freak.codefreak.service.file

import de.code_freak.codefreak.service.BaseService
import de.code_freak.codefreak.util.TarUtil
import org.apache.commons.compress.archivers.tar.TarArchiveEntry
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.util.StreamUtils
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.util.UUID

@Service
class FileContentService : BaseService() {

  @Autowired
  lateinit var fileService: FileService

  enum class VirtualFileType {
    FILE,
    DIRECTORY,
    SYMLINK
  }

  class VirtualFile(
    val path: String,
    val lastModifiedDate: Instant,
    val type: VirtualFileType,
    val content: ByteArray?
  )

  fun getFile(fileCollectionId: UUID, path: String): VirtualFile {
    val collection = fileService.readCollectionTar(fileCollectionId)
    collection.use {
      TarUtil.findFile(it, path) { entry, fileStream ->
        return tarEntryToVirtualFile(entry, fileStream)
      }
    }
  }

  fun getFiles(fileCollectionId: UUID): List<VirtualFile> {
    val collection = fileService.readCollectionTar(fileCollectionId)
    TarArchiveInputStream(collection).let { tar ->
      return generateSequence { tar.nextTarEntry }.map { tarEntryToVirtualFile(it, tar) }.toList()
    }
  }

  private fun tarEntryToVirtualFile(entry: TarArchiveEntry, tarStream: TarArchiveInputStream): VirtualFile {
    val content = if (entry.isFile) {
      val output = ByteArrayOutputStream()
      StreamUtils.copy(tarStream, output)
      output.toByteArray()
    } else null

    return VirtualFile(
        path = entry.name,
        lastModifiedDate = entry.modTime.toInstant(),
        content = content,
        type = when {
          entry.isLink || entry.isSymbolicLink -> VirtualFileType.SYMLINK
          entry.isDirectory -> VirtualFileType.DIRECTORY
          else -> VirtualFileType.FILE
        }
    )
  }
}