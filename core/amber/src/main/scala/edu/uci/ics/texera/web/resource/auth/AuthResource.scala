package edu.uci.ics.texera.web.resource.auth

import edu.uci.ics.amber.engine.common.AmberConfig
import edu.uci.ics.texera.dao.SqlServer
import edu.uci.ics.texera.web.auth.JwtAuth._
import edu.uci.ics.texera.web.model.http.request.auth.{LdapUserRegistrationRequest, RefreshTokenRequest, UserLoginRequest, UserRegistrationRequest}
import edu.uci.ics.texera.web.model.http.response.TokenIssueResponse
import edu.uci.ics.texera.dao.jooq.generated.Tables.USER
import edu.uci.ics.texera.dao.jooq.generated.enums.UserRoleEnum
import edu.uci.ics.texera.dao.jooq.generated.tables.daos.UserDao
import edu.uci.ics.texera.dao.jooq.generated.tables.pojos.User
import edu.uci.ics.texera.web.resource.auth.AuthResource._
import org.jasypt.util.password.StrongPasswordEncryptor
import javax.ws.rs._
import javax.ws.rs.core.{MediaType, Response}
import com.unboundid.ldap.sdk.{AddRequest, Entry, LDAPConnection}
import com.unboundid.ldap.sdk._
import com.jcraft.jsch._
import edu.uci.ics.texera.web.auth.SessionUser
import io.dropwizard.auth.Auth
import play.api.libs.json.Json
import java.security.SecureRandom
import java.util.Base64

object AuthResource {

  final private val HOST_IP: String = "3.142.252.209"

  final private lazy val userDao = new UserDao(
    SqlServer
      .getInstance()
      .createDSLContext()
      .configuration
  )

  /**
    * Retrieve exactly one User from databases with the given username and password.
    * The password is used to validate against the hashed password stored in the db.
    *
    * @param name     String

    * @param password String, plain text password
    * @return
    */
  def retrieveUserByUsernameAndPassword(name: String, password: String): Option[User] = {
    Option(
      SqlServer
        .getInstance()
        .createDSLContext()
        .select()
        .from(USER)
        .where(USER.NAME.eq(name))
        .fetchOneInto(classOf[User])
    ).filter(user => new StrongPasswordEncryptor().checkPassword(password, user.getPassword))
  }


  def generateSecurePassword(length: Int = 8): String = {
    val random = new SecureRandom()
    val bytes = new Array[Byte](length)
    random.nextBytes(bytes)
    Base64.getUrlEncoder.withoutPadding.encodeToString(bytes).take(length)
  }

  def addUserToLdap(ldapUser: User): LDAPResult = {
    val ldapHost = HOST_IP
    val ldapPort = 389
    val ldapBindDN = "cn=admin,dc=admap,dc=com"
    val ldapBindPassword = "23627"
    val baseDN = "dc=admap,dc=com"

    val emailPrefix = ldapUser.getEmail.split("@")(0)
    val uid = ldapUser.getUid
    val name = ldapUser.getName

    val username = s"${emailPrefix}_${uid}"
    val password = ldapUser.getPassword

    var connection: LDAPConnection = null
    try {
      connection = new LDAPConnection(ldapHost, ldapPort, ldapBindDN, ldapBindPassword)
      val entry = new Entry(s"uid=$username,ou=users,$baseDN")


      entry.addAttribute("objectClass", "inetOrgPerson", "posixAccount", "shadowAccount")
      entry.addAttribute("uid", username)
      entry.addAttribute("cn", name)
      entry.addAttribute("sn", name)
      entry.addAttribute("userPassword", password)
      entry.addAttribute("loginShell", "/bin/bash")
      entry.addAttribute("uidNumber", uid.toString)
      entry.addAttribute("gidNumber", "5000")
      entry.addAttribute("homeDirectory", s"/home/users/$username")

      // Use AddRequest explicitly
      val addRequest = new AddRequest(entry)
      val result = connection.add(addRequest)

      createHomeDirectory(ldapUser)

      result

    } catch {
      case e: LDAPException =>
        println(s"LDAP error: ${e.getMessage}, Code: ${e.getResultCode}")
        throw e

    } finally {
      if (connection != null && connection.isConnected) {
        connection.close()
      }
    }
  }

  /**
   * Creates a home directory for user's home directory.
   * The directory will be created at: /home/users/$username
   * where $username is derived from the user's email and UID.
   */
  def createHomeDirectory(ldapUser: User): Boolean = {
    val emailPrefix = ldapUser.getEmail.split("@")(0)
    val uid = ldapUser.getUid
    val username = s"${emailPrefix}_${uid}"

    val path = s"/home/users/$username/"

    val sshHost = HOST_IP
    val sshUser = "ubuntu"
    val privateKeyPath = "/Users/lanaramadan/Desktop/012624-2.pem"

    // make directory and change ownership to the user
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
        println(s"Error: ${e.getMessage}")
        e.printStackTrace()
        false
    } finally {
      // Ensure the session is disconnected
      if (session != null && session.isConnected) {
        session.disconnect()
      }
    }
  }
}

@Path("/auth/")
@Consumes(Array(MediaType.APPLICATION_JSON))
@Produces(Array(MediaType.APPLICATION_JSON))
class AuthResource {

  @GET
  @Path("/password")
  def password(@Auth user: SessionUser): String = {
    val userFromDb = userDao.fetchOneByEmail(user.getEmail)
    val password = userFromDb.getPassword
    if (password == null) {
      throw new Exception("Password is null")
    }
    password
  }

  @POST
  @Path("/login")
  def login(request: UserLoginRequest): TokenIssueResponse = {
    if (!AmberConfig.isUserSystemEnabled)
      throw new NotAcceptableException("User System is disabled on the backend!")
    retrieveUserByUsernameAndPassword(request.username, request.password) match {
      case Some(user) =>
        TokenIssueResponse(jwtToken(jwtClaims(user, dayToMin(TOKEN_EXPIRE_TIME_IN_DAYS))))
      case None => throw new NotAuthorizedException("Login credentials are incorrect.")
    }
  }

  @POST
  @Path("/refresh")
  def refresh(request: RefreshTokenRequest): TokenIssueResponse = {
    val claims = jwtConsumer.process(request.accessToken).getJwtClaims
    claims.setExpirationTimeMinutesInTheFuture(dayToMin(TOKEN_EXPIRE_TIME_IN_DAYS).toFloat)
    TokenIssueResponse(jwtToken(claims))
  }

  @POST
  @Path("/register")
  def register(request: UserRegistrationRequest): TokenIssueResponse = {
    println("TESTING")
    if (!AmberConfig.isUserSystemEnabled)
      throw new NotAcceptableException("User System is disabled on the backend!")
    val username = request.username
    if (username == null) throw new NotAcceptableException("Username cannot be null.")
    if (username.trim.isEmpty) throw new NotAcceptableException("Username cannot be empty.")
    userDao.fetchByName(username).size() match {
      case 0 =>
        val user = new User
        user.setName(username)
        user.setEmail(username)
        user.setRole(UserRoleEnum.ADMIN)
        user.setPassword(generateSecurePassword())
        userDao.insert(user)
        addUserToLdap(user)
        TokenIssueResponse(jwtToken(jwtClaims(user, dayToMin(TOKEN_EXPIRE_TIME_IN_DAYS))))
      case _ =>
        // the username exists already
        throw new NotAcceptableException("Username exists already.")
    }
  }
}
