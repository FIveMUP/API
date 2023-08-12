'use strict'

module.exports = async function (fastify, opts) {
    const argon2 = require('argon2')
    const { nanoid } = require('nanoid')

    fastify.get('/', async function (request, reply) {
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

            if (rows.length > 0) {
                return reply
                    .code(500)
                    .send({ message: 'Username already exists' })
            }

            const hashedPassword = await argon2.hash(password)
            const userId = nanoid(12)

            const userRegistered = await conn.query(
                'INSERT INTO users (id, username, password, rank, servers) VALUES (?, ?, ?, ?, ?)',
                [userId, username, hashedPassword, 'user', '[]']
            )

            if (!userRegistered) {
                return reply.code(500).send({
                    message: 'Something went wrong, please try again later',
                })
            }

            return {
                message: 'User registered',
                token: await jwt.createToken({ type: 'user_auth', userId }),
            }
        } finally {
            if (conn) conn.release()
        }
    })
}
