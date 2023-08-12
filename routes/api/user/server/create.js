'use strict'

const { nanoid } = require('nanoid')

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

            userServers.push(serverId)

            await conn.beginTransaction()

            await conn.query(
                'UPDATE users SET servers = ? WHERE id = ?',
                [JSON.stringify(userServers), validToken.userId]
            )

            await conn.query(
                'INSERT INTO servers (id, name, cfxCode, cfxLicense) VALUES (?, ?, ?, ?)',
                [serverId, name, cfxCode, cfxLicense]
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
            return reply.code(500).send({ message: 'Internal server error' })
        } finally {
            if (conn) conn.release()
        }
    })
}
