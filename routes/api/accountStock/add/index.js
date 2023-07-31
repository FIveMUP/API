'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')
    const UserModel = require('../../../../models/User')
    const jwt = new JWTModel()
    const { nanoid } = require('nanoid')

    fastify.get('/', async function (request, reply) {
        let conn

        const {
            username,
            mail,
            password,
            entitlementId,
            machineHash,
            auth_token,
        } = request.query

        if (
            !username ||
            !mail ||
            !password ||
            !entitlementId ||
            !machineHash ||
            !auth_token
        ) {
            return reply.code(400).send({
                message:
                    'Need to send: username, mail, password, entitlementId, machineHash, auth_token',
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
                    message: 'Only admins can add stock',
                })
            }

            const rows = await conn.query(
                'SELECT * FROM stock_accounts WHERE entitlementId = ?',
                entitlementId
            )

            if (rows.length > 0) {
                return reply.code(400).send({
                    message: 'Stock already exists',
                })
            }

            const stockId = nanoid(12)

            const insertResult = await conn.query(
                'INSERT INTO stock_accounts (id, username, mail, password, entitlementId, machineHash) VALUES (?, ?, ?, ?, ?, ?)',
                [stockId, username, mail, password, entitlementId, machineHash]
            )

            if (insertResult.affectedRows <= 0) {
                return reply.code(400).send({
                    message: 'Failed to add stock',
                })
            }

            return {
                message: 'Stock added',
            }
        } finally {
            if (conn) conn.release()
        }
    })
}
