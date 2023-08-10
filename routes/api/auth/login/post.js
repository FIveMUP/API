'use strict'

module.exports = async function (fastify, opts) {
    const argon2 = require('argon2')

    fastify.post('/', async function (request, reply) {
        let conn
        const JWTModel = require('../../../../models/JWT')
        const jwt = new JWTModel()

        const { username, password } = request.query

        if (!username || !password) {
            return reply.code(500).send({
                message: username
                    ? 'Password is required'
                    : 'Username is required',
            })
        }

        try {
            conn = await request.dbpool.getConnection()
            const rows = await conn.query(
                'SELECT * FROM users WHERE username = ?',
                [username]
            )

            if (rows.length <= 0) {
                return reply
                    .code(500)
                    .send({ message: 'Username does not exist' })
            }

            const passwordMatch = await argon2.verify(
                rows[0].password,
                password
            )

            if (!passwordMatch) {
                return reply
                    .code(500)
                    .send({ message: 'Password does not match' })
            }

            console.log(`User ${username} logged in`)

            return {
                message: 'User logged in',
                token: await jwt.createToken({
                    type: 'user_auth',
                    userId: rows[0].id,
                }),
            }
        } finally {
            if (conn) conn.release()
        }
    })
}
