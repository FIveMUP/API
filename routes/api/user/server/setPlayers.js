'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')

    fastify.post('/setPlayers', async function (request, reply) {
        let conn
        const jwt = new JWTModel()

        const { auth_token } = request.query
        const { serverId, playerAmount } = request.body

        if (!auth_token || !serverId || isNaN(playerAmount)) {
            return reply.code(400).send({
                message: 'auth_token, serverId, and playerAmount are required',
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
            await conn.beginTransaction()

            const rows = await conn.query(
                'SELECT * FROM users WHERE id = ?',
                validToken.userId
            )

            if (rows.length <= 0) {
                await conn.rollback()
                return reply.code(400).send({ message: 'user does not exist' })
            }

            const servers = JSON.parse(rows[0].servers)

            if (!servers.includes(serverId)) {
                await conn.rollback()
                return reply.code(400).send({ message: 'Server does not exist on user' })
            }
            
            const availableBots = await conn.query(
                'SELECT * FROM stock_accounts WHERE owner = ? AND assignedServer = ? FOR UPDATE',
                [validToken.userId, 'none']
            )

            const assignedBots = await conn.query(
                'SELECT * FROM stock_accounts WHERE owner = ? AND assignedServer = ? FOR UPDATE',
                [validToken.userId, serverId]
            )


            const availableBotsAmount = availableBots.length
            const assignedBotsAmount = assignedBots.length

            if (playerAmount > assignedBotsAmount) {
                const botsToAssign = playerAmount - assignedBotsAmount

                if (botsToAssign > availableBotsAmount) {
                    await conn.rollback()
                    return reply.code(400).send({ message: 'Not enough bots available' })
                }

                for (let i = 0; i < botsToAssign; i++) {
                    await conn.query(
                        'UPDATE stock_accounts SET assignedServer = ? WHERE id = ?',
                        [serverId, availableBots[i].id]
                    )
                }
            } else if (playerAmount < assignedBotsAmount) {
                const botsToUnassign = assignedBotsAmount - playerAmount

                if (botsToUnassign > assignedBotsAmount) {
                    await conn.rollback()
                    return reply.code(400).send({ message: 'Not enough bots assigned' })
                }

                for (let i = 0; i < botsToUnassign; i++) {
                    await conn.query(
                        'UPDATE stock_accounts SET assignedServer = ? WHERE id = ?',
                        ['none', assignedBots[i].id]
                    )
                }
            } else {
                await conn.rollback()
                return reply.code(400).send({ message: 'Player amount is the same. No changes made.' })
            }

            await conn.commit()

            console.log(`Bots changed for #${serverId} by user ${validToken.userId} from ${assignedBotsAmount} to ${playerAmount}`)

            return {
                message: 'Players assigned',
            }
        } catch (err) {
            console.log(err)
            await conn.rollback()
            return reply.code(500).send({ message: 'Internal server error' })
        } finally {
            if (conn) conn.release()
        }
    })
}
