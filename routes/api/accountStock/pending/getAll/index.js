'use strict'

module.exports = async function (fastify, opts) {
    fastify.get('/', async function (request, reply) {
        let conn
        
        const {
            type_status,
            auth_token,
        } = request.query

        if (
            !auth_token ||
            !type_status
        ) {
            return reply.code(500).send({
                message:
                    'Need to send: auth_token, type_status',
            })
        }

        try {
            conn = await request.dbpool.getConnection()

            if (auth_token !== "califatogang") {
                console.log(`Invalid auth token: ${auth_token}`)
                return reply.code(500).send("Token invalid")
            }

            const pending_accounts = await conn.query(
                'SELECT * FROM pending_stock_accounts WHERE status = ?',
                [type_status]
            );

            if (pending_accounts.length === 0) {
                return reply.code(500).send("There is no founded accounts")
            }

            return { pending_accounts }
        } finally {
            if (conn) conn.release()
        }
    })
}
