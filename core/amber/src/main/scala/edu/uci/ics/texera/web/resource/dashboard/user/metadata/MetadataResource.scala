package edu.uci.ics.texera.web.resource.dashboard.user.metadata

import javax.ws.rs._
import javax.ws.rs.core.{MediaType, Response}
import javax.annotation.security.RolesAllowed
import edu.uci.ics.texera.web.auth.SessionUser
import io.dropwizard.auth.Auth
import com.unboundid.ldap.sdk.{LDAPConnection, Entry, AddRequest}
import com.unboundid.ldap.sdk._
import com.jcraft.jsch._
import play.api.libs.json.{Json, OFormat}
object MetadataResource {
  // Define all payload case classes in the companion object

  case class ContributorPayload(
                                 name: String,
                                 creator: Boolean,
                                 contributorType: String,
                                 affiliation: String
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
  final private val HOST_IP: String = "3.145.57.82"

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
    val privateKeyPath = "/Users/lanaramadan/Desktop/012624-2.pem"

    // Command to create the directory and change ownership accordingly
    val command = s"sudo mkdir -p $path && sudo chown -R $username:5000 $path"

    var session: Session = null
    try {
      val jsch = new JSch()
      jsch.setKnownHosts("/Users/lanaramadan/.ssh/known_hosts")
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
    payload: MetadataResource.MetadataCreationPayload): Response = {




    // Create the metadata subdirectory in the user's home directory
    createMetadataSubdirectory(user, payload.metadataName)

    Response.ok(Json.obj("message" -> "Metadata created successfully")).build()
  }
}
