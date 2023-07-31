'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../models/JWT')

    fastify.get('/', async function (request, reply) {
        let conn
        const jwt = new JWTModel()

        const { auth_token } = request.query

        if (!auth_token) {
            return reply.code(400).send({
                message: 'auth_token is required',
            })
        }

        try {
            const validToken = await jwt.verifyTokenWithAuth(
                auth_token,
                'user_auth'
            )
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

            return {
                message: 'User info retrieved',
                user: {
                    id: rows[0].id,
                    username: rows[0].username,
                    rank: rows[0].rank,
                    servers: JSON.parse(rows[0].servers),
                },
            }
        } finally {
            if (conn) conn.release()
        }
    })
}
