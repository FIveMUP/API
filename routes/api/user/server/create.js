'use strict'

const { nanoid } = require('nanoid')
const axios = require('axios').default

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')

    fastify.post('/create', async function (request, reply) {
        let conn
        const jwt = new JWTModel()

        const { auth_token } = request.query
        const { name, cfxCode, cfxLicense } = request.body

        if (!auth_token || !name || !cfxCode || !cfxLicense) {
            return reply.code(400).send({
                message: 'auth_token, name, cfxCode, and cfxLicense are required',
            })
        }

        try {
            if (cfxCode.length !== 6) {
                return reply.code(400).send({
                    message: 'cfxCode doesnt meet requirements, example: "3kzpeo"'
                })
            }

            const validToken = await jwt.verifyTokenWithAuth(
                auth_token,
                'user_auth'
            )

            const serverId = nanoid(12)

            if (validToken?.valid === false)
                return reply.code(400).send(validToken)

            conn = await request.dbpool.getConnection()
            const rows = await conn.query(
                'SELECT * FROM users WHERE id = ?',
                validToken.userId
            )

            if (rows.length <= 0) {
                return reply.code(400).send({ message: 'user does not exist' })
            }

            const userServers = JSON.parse(rows[0].servers)

            if (userServers.includes(serverId)) {
                return reply.code(400).send({ message: 'Server already exists on user' })
            }

            const sv_licenseKeyToken_response = await axios.get(`https://servers-frontend.fivem.net/api/servers/single/${cfxCode}`, {
                headers: {
                    'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.3',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    Accept: '*/*',
                    Connection: 'keep-alive',
                },
                withCredentials: true,
            })
            const sv_licenseKeyToken = sv_licenseKeyToken_response.data?.Data?.vars?.sv_licenseKeyToken
            if (!sv_licenseKeyToken) {
                return reply.code(400).send({ message: 'Invalid cfxCode or FiveM API is down' })
            }

            console.log(`Successfully verified cfxCode ${cfxCode} with FiveM API, sv_licenseKeyToken: ${sv_licenseKeyToken}`)

            userServers.push(serverId)

            await conn.beginTransaction()

            await conn.query(
                'UPDATE users SET servers = ? WHERE id = ?',
                [JSON.stringify(userServers), validToken.userId]
            )

            await conn.query(
                'INSERT INTO servers (id, name, cfxCode, cfxLicense, sv_licenseKeyToken) VALUES (?, ?, ?, ?, ?)',
                [serverId, name, cfxCode, cfxLicense, sv_licenseKeyToken]
            )

            await conn.commit()

            console.log(`User ${validToken.userId} created server ${serverId}`)

            return {
                message: 'Server created successfully',
                serverId,
            }
        } catch (err) {
            console.error(err)
            conn.rollback()
            return reply.code(500).send({ message: 'Internal server error, ' + err })
        } finally {
            if (conn) conn.release()
        }
    })
}
