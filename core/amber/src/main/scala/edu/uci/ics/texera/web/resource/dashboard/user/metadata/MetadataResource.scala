package edu.uci.ics.texera.web.resource.dashboard.user.metadata

import javax.ws.rs._
import javax.ws.rs.core.{MediaType, Response}
import javax.annotation.security.RolesAllowed
import edu.uci.ics.texera.auth.SessionUser
import io.dropwizard.auth.Auth
import edu.uci.ics.texera.dao.jooq.generated.tables.Metadata.METADATA
import edu.uci.ics.texera.dao.jooq.generated.tables.User.USER
import edu.uci.ics.texera.dao.jooq.generated.tables.daos.{MetadataContributorDao, MetadataDao, MetadataFunderDao, MetadataSpecimenDao}
import edu.uci.ics.texera.dao.jooq.generated.tables.pojos.{Metadata, MetadataContributor, MetadataFunder, MetadataSpecimen}
import edu.uci.ics.texera.dao.jooq.generated.enums.ContributorRoleEnum
import edu.uci.ics.texera.dao.jooq.generated.enums.SpecimenSexEnum
import edu.uci.ics.amber.engine.common.Utils.withTransaction
import play.api.libs.json.Json

import scala.jdk.CollectionConverters._
import com.jcraft.jsch._
import edu.uci.ics.texera.dao.SqlServer
import play.api.libs.json.{Json, OFormat}
import com.typesafe.config.{Config, ConfigFactory}
import edu.uci.ics.texera.web.resource.auth.AuthResource.{conf, configFile, getConfSource, lastModifiedTime}

import java.io.File

object MetadataResource {
  private val configFile: File = new File("src/main/resources/application.conf")
  private var lastModifiedTime: Long = 0
  private var conf: Config = ConfigFactory.load()

  private def getConfSource: Config = {
    if (lastModifiedTime == configFile.lastModified()) {
      conf.resolve()
    } else {
      lastModifiedTime = configFile.lastModified()
      conf = ConfigFactory.parseFile(configFile).withFallback(ConfigFactory.load())
      conf.resolve()
    }
  }

  case class ContributorPayload(
      name: String,
      creator: Boolean,
      contributorType: String,
      affiliation: String
  )

  case class MetadataWithDetails(
      metadata: Metadata,
      contributors: List[MetadataContributor],
      funders: List[MetadataFunder],
      specimens: List[MetadataSpecimen]
  )

  object ContributorPayload {
    implicit val format: OFormat[ContributorPayload] = Json.format[ContributorPayload]
  }

  case class FunderPayload(
      name: String,
      awardTitle: String
  )

  object FunderPayload {
    implicit val format: OFormat[FunderPayload] = Json.format[FunderPayload]
  }

  case class SpecimenPayload(
      name: String,
      age: Int,
      sex: String
  )

  object SpecimenPayload {
    implicit val format: OFormat[SpecimenPayload] = Json.format[SpecimenPayload]
  }

  case class MetadataCreationPayload(
      metadataName: String,
      contributors: List[ContributorPayload],
      funders: List[FunderPayload],
      specimens: List[SpecimenPayload]
  )

  object MetadataCreationPayload {
    implicit val format: OFormat[MetadataCreationPayload] = Json.format[MetadataCreationPayload]
  }

  // Other constants or helper methods if needed

}

@Path("/metadata")
@Produces(Array(MediaType.APPLICATION_JSON))
@Consumes(Array(MediaType.APPLICATION_JSON))
class MetadataResource {
  private val context = SqlServer
    .getInstance()
    .createDSLContext()
  final private val HOST_IP: String = MetadataResource.getConfSource.getString("aws-service.public-ip")
  final private val PRIVATE_KEY_PATH: String = MetadataResource.getConfSource.getString("aws-service.private-key-path")
  final private val KNOWN_HOSTS: String = MetadataResource.getConfSource.getString("aws-service.known-hosts")

  /**
    * Creates a subdirectory under the user's home directory.
    * The directory will be created at: /home/users/$username/$metadataName
    * where $username is derived from the user's email and UID.
    */
  def createMetadataSubdirectory(ldapUser: SessionUser, metadataName: String): Boolean = {
    val emailPrefix = ldapUser.getEmail.split("@")(0)
    val uid = ldapUser.getUid
    val username = s"${emailPrefix}_${uid}"

    val path = s"/home/users/$username/$metadataName/"

    val sshHost = HOST_IP
    val sshUser = "ubuntu"
    val privateKeyPath = PRIVATE_KEY_PATH

    // Command to create the directory and change ownership accordingly
    val command = s"sudo mkdir -p $path && sudo chown -R $username:5000 $path"

    var session: Session = null
    try {
      val jsch = new JSch()
      jsch.setKnownHosts(KNOWN_HOSTS)
      jsch.addIdentity(privateKeyPath, "12345")
      session = jsch.getSession(sshUser, sshHost, 22)
      session.setConfig("StrictHostKeyChecking", "no")
      session.connect()
      val channel = session.openChannel("exec").asInstanceOf[ChannelExec]
      channel.setCommand(command)
      channel.setErrStream(System.err)
      channel.connect()
      true
    } catch {
      case e: Exception =>
        e.printStackTrace()
        false
    } finally {
      if (session != null && session.isConnected) {
        session.disconnect()
      }
    }
  }

  @POST
  @RolesAllowed(Array("REGULAR", "ADMIN"))
  @Path("/create")
  def createMetadata(
      @Auth user: SessionUser,
      payload: MetadataResource.MetadataCreationPayload
  ): Response = {

    // insert in database
    withTransaction(context) { ctx =>
      val uid = user.getUid
      val metadataDao = new MetadataDao(ctx.configuration())
      val metadataContributorDao = new MetadataContributorDao(ctx.configuration())
      val metadataFunderDao = new MetadataFunderDao(ctx.configuration())
      val metadataSpecimenDao = new MetadataSpecimenDao(ctx.configuration())

      // Check if metadata with the same name exists for the user
      val existingMetadataNames = metadataDao.fetchByOwnerUid(uid).asScala.map(_.getName)
      if (existingMetadataNames.contains(payload.metadataName)) {
        throw new BadRequestException("Metadata with the same name already exists")
      }

      // Create metadata
      val metadata = new Metadata()
      metadata.setName(payload.metadataName)
      metadata.setOwnerUid(uid)

      // Insert metadata
      val createdMetadata = ctx
        .insertInto(METADATA)
        .set(ctx.newRecord(METADATA, metadata))
        .returning()
        .fetchOne()

      val mid = createdMetadata.getMid

      // Insert contributors
      payload.contributors.foreach { contributor =>
        val metadataContributor = new MetadataContributor()
        metadataContributor.setMetadataId(mid)
        metadataContributor.setName(contributor.name)
        metadataContributor.setCreator(contributor.creator)
        metadataContributor.setType(ContributorRoleEnum.lookupLiteral(contributor.contributorType))
        metadataContributor.setAffiliation(contributor.affiliation)
        metadataContributorDao.insert(metadataContributor)
      }

      // Insert funders
      payload.funders.foreach { funder =>
        val metadataFunder = new MetadataFunder()
        metadataFunder.setMetadataId(mid)
        metadataFunder.setName(funder.name)
        metadataFunder.setAwardTitle(funder.awardTitle)
        metadataFunderDao.insert(metadataFunder)
      }

      // Insert specimens
      payload.specimens.foreach { specimen =>
        val metadataSpecimen = new MetadataSpecimen()
        metadataSpecimen.setMetadataId(mid)
        metadataSpecimen.setName(specimen.name)
        metadataSpecimen.setAge(specimen.age)
        metadataSpecimen.setSex(SpecimenSexEnum.lookupLiteral(specimen.sex))
        metadataSpecimenDao.insert(metadataSpecimen)
      }
    }

    // Create the metadata subdirectory in the user's home directory
    createMetadataSubdirectory(user, payload.metadataName)

    Response.ok(Json.obj("message" -> "Metadata created successfully")).build()
  }

  @GET
  @RolesAllowed(Array("REGULAR", "ADMIN"))
  @Path("")
  def listMetadata(
      @Auth user: SessionUser
  ): List[MetadataResource.MetadataWithDetails] = {

    withTransaction(context)(ctx => {
      val uid = user.getUid
      val metadataDao = new MetadataDao(ctx.configuration())
      val metadataContributorDao = new MetadataContributorDao(ctx.configuration())
      val metadataFunderDao = new MetadataFunderDao(ctx.configuration())
      val metadataSpecimenDao = new MetadataSpecimenDao(ctx.configuration())

      // Fetch all metadata that belongs to the user
      val metadataList = metadataDao.fetchByOwnerUid(uid).asScala.toList

      // For each metadata item, fetch the related contributors, funders, and specimens
      metadataList.map { metadata =>
        val metadataId = metadata.getMid
        val contributors = metadataContributorDao.fetchByMetadataId(metadataId).asScala.toList
        val funders = metadataFunderDao.fetchByMetadataId(metadataId).asScala.toList
        val specimens = metadataSpecimenDao.fetchByMetadataId(metadataId).asScala.toList

        // Return full metadata
        MetadataResource.MetadataWithDetails(
          metadata = metadata,
          contributors = contributors,
          funders = funders,
          specimens = specimens
        )
      }
    })
  }
}
