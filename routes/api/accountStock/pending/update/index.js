'use strict'

module.exports = async function (fastify, opts) {
    fastify.post('/', async function (request, reply) {
        let conn

        const {
            mail,
            status,
            machineHash,
            entitlementId,
            pc_name,
            auth_token,
        } = request.query


        console.log(mail, status, machineHash, entitlementId, pc_name, auth_token)

        if (
            !mail ||
            !status ||
            machineHash === null ||
            entitlementId === null ||
            !pc_name ||
            !auth_token
        ) {
            return reply.code(400).send({
                message:
                    'Need to send: username, mail, status, machineHash, entitlementId, pc_name, auth_token',
            })
        }

        try {
            console.log(`Updating stock account [${mail}]`)
            conn = await request.dbpool.getConnection()

            if (auth_token !== "califatogang") {
                return reply.code(400).send(validToken)
            }

            const rows = await conn.query(
                'SELECT * FROM pending_stock_accounts WHERE mail = ?',
                mail
            )

            if (rows.length <= 0) {
                return reply.code(500).send({
                    message: 'Account not found',
                })
            }

            const updateResult = await conn.query(
                'UPDATE pending_stock_accounts SET status = ?, machineHash = ?, entitlementId = ?, checkedBy = ? WHERE mail = ?',
                [
                    status,
                    machineHash != "" ? machineHash : null,
                    entitlementId != "" ? entitlementId : null,
                    pc_name, 
                    mail
                ]
            )

            if (updateResult.affectedRows <= 0) {
                return reply.code(500).send({
                    message: 'Error updating account',
                })
            }

            console.log(`Stock account [${mail}] updated`)

            return { message: 'Account updated' }
        } finally {
            if (conn) conn.release()
        }
    })
}
