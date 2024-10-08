'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')
    const UserModel = require('../../../../models/User')
    const jwt = new JWTModel()
    const crypto = require('crypto');

    const hashData = async (data, length) => {
    const hash = crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');
        return hash.slice(0, length);
    }

    const generateIdentifiers = async (salt) => {
        if (salt.length !== 12) {
            throw new Error("Salt must be 12 characters long");
        }

        const identifiers = {};

        identifiers.license = 'license:' + await hashData('license' + salt, 40);
        identifiers.license2 = 'license2:' + await hashData('license' + salt, 40);
        identifiers.steam = 'steam:110000' + await hashData('steam' + salt, 9);
        identifiers.xbl = 'xbl:25354' + await hashData('xbl' + salt, 10);
        identifiers.live = 'live:' + await hashData('live' + salt, 13);
        identifiers.discord = 'discord:' + await hashData('discord' + salt, 18);
        identifiers.fivem = 'fivem:' + await hashData('fivem' + salt, 7);

        const identifiersArray = Object.values(identifiers);
        return identifiersArray;
    }

    fastify.get('/getIngressHb', async function (request, reply) {
        let conn

        const { cfxToken } = request.query

        if (!cfxToken) {
            return reply.code(400).send({
                message:
                    'Need to send: cfxToken',
            })
        }

        try {
            conn = await request.dbpool.getConnection()

            const rows = await conn.query(
                'SELECT * FROM servers WHERE cfxLicense = ?',
                [cfxToken]
            )

            if (!rows[0]) {
                return reply.code(404).send({
                    message:
                        'No server found with that token',
                })
            }

            const cfxCode = rows[0].cfxCode
            const cfxLicense = rows[0].cfxLicense
            const serverId = rows[0].id

            const assignedBots = await conn.query(
                'SELECT * FROM stock_accounts WHERE assignedServer = ?',
                [serverId]
            )

            if (assignedBots.length <= 0) {
                return reply.code(500).send({
                    message: 'No assigned bots found for that server',
                })
            }

            const fakeBotsArray = []

            const baseId = 4500

            for (let i = 0; i < assignedBots.length; i++) {
                const bot = assignedBots[i]
                const uniqueIdentifiers = await generateIdentifiers(bot.id);
                const botData = {
                    endpoint: '127.0.0.1',
                    id: bot.id,
                    identifiers: uniqueIdentifiers,
                    // identifiers: [
                    //     `steam:${bot.id}`
                    // ],
                    name: bot.username,
                    ping: Math.floor(Math.random() * 130) + 20
                }

                // console.log(botData)

                fakeBotsArray.push(botData)
            }

            return { bots: fakeBotsArray }
        } finally {
            if (conn) conn.release()
        }
    })
}
