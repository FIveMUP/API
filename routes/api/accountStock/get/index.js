'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')
    const UserModel = require('../../../../models/User')
    const jwt = new JWTModel()
    const { nanoid } = require('nanoid')

    fastify.get('/', async function (request, reply) {
        let conn

        const { auth_token,} = request.query
        console.log("ASDASDS")
        if (!auth_token) {
            return reply.code(400).send({
                message:
                    'Need to send: auth_token',
            })
        }

        try {
            conn = await request.dbpool.getConnection()

            const validToken = await jwt.verifyTokenWithAuth(
                auth_token,
                'user_auth'
            )

            if (validToken?.valid === false)
                return reply.code(400).send(validToken)

            const user = new UserModel(validToken.userId, request.dbpool)

            const userData = await user.getUserData()

            if (userData?.valid === false) return reply.code(400).send(userData)

            if (userData?.rank !== 'admin') {
                return reply.code(400).send({
                    message: 'Only admins can get stock',
                })
            }

            console.time('getStock')
            
            const rows = await conn.query(
                'SELECT * FROM stock_accounts',
                )
                
                if (rows.length < 0) {
                    return reply.code(400).send({
                        message: 'There is no stock left',
                    })
                }
                
                console.timeEnd('getStock')
            return { valid: true, rows }
        } finally {
            if (conn) conn.release()
        }
    })
}
