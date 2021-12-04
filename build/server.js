"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require('dotenv').config();
const express_1 = (0, tslib_1.__importDefault)(require("express"));
const axios_1 = (0, tslib_1.__importDefault)(require("axios"));
const request_1 = (0, tslib_1.__importDefault)(require("./request"));
const app = (0, express_1.default)();
const port = 3000;
let isFinished = true;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(request_1.default);
try {
    if (!process.env.INTERVAL_TIME) {
        console.log('INTERVAL_TIME is not defined');
        process.exit(1);
    }
    app.listen(port, () => {
        console.log(`[HTTP] Service started at port: ${port}`);
        global.blockQueue = [];
        global.unBlockQueue = [];
        global.allblockList = [];
        global.errorLists = [];
        global.totalSubmit = 0;
        setInterval(() => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
            var _a, _b;
            if (!isFinished)
                return;
            let cursor = undefined;
            let list = [];
            isFinished = false;
            console.log('[CF] Starting load blocklist...');
            while (!isFinished) {
                yield new Promise(r => setTimeout(r, 300));
                let blockedList = yield axios_1.default.get(`https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/rules/lists/${process.env.LIST_ID}/items${cursor ? `?cursor=${cursor}` : ''}`, {
                    headers: {
                        'X-Auth-Email': process.env.AUTH_EMAIL,
                        'X-Auth-Key': process.env.AUTH_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                cursor = (_b = (_a = blockedList.data.result_info) === null || _a === void 0 ? void 0 : _a.cursors) === null || _b === void 0 ? void 0 : _b.after;
                isFinished = cursor == null || typeof cursor == 'undefined';
                for (const recive of blockedList.data.result) {
                    list.push(recive);
                }
                // console.log('[CF] total blocked list:', list.length, '| Next:', cursor || 'none');
                if (isFinished)
                    break;
            }
            global.allblockList = list;
            console.log('[CF] All blocklist loaded: ', global.allblockList.length);
        }), parseInt(process.env.LIST_INTERVAL_TIME));
        setInterval(() => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
            let toAdd = [];
            let toRemove = [];
            let ubQueue = global.unBlockQueue.slice();
            let bQueue = global.blockQueue.slice();
            if (bQueue.length > 0) {
                for (const ip of bQueue) {
                    toAdd.push({
                        ip: ip,
                        comment: 'blocked by burstwall at ' + new Date().getTime()
                    });
                    let index = bQueue.indexOf(ip);
                    if (index >= 0) {
                        bQueue.splice(index, 1);
                    }
                }
                if (toAdd.length > 0) {
                    //Create list
                    try {
                        let result = yield axios_1.default.post(`https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/rules/lists/${process.env.LIST_ID}/items`, JSON.stringify(toAdd), {
                            headers: {
                                'X-Auth-Email': process.env.AUTH_EMAIL,
                                'X-Auth-Key': process.env.AUTH_KEY,
                                'Content-Type': 'application/json'
                            },
                            data: JSON.stringify(toAdd)
                        });
                        if (result.data.success) {
                            global.blockQueue = bQueue;
                            console.log('[CF] Blocked:', toAdd.length);
                        }
                        else {
                            const error = {
                                dt: new Date(),
                                event: 'add list',
                                stack: result.data,
                                message: 'failed to add list'
                            };
                            global.errorLists.push(error);
                            console.log('[CF] Error: ', result.data.errors);
                        }
                    }
                    catch (e) {
                        const error = {
                            dt: new Date(),
                            event: 'add list',
                            stack: e.stack,
                            message: 'failed to add list'
                        };
                        global.errorLists.push(error);
                        if (e.response) {
                            const error = {
                                dt: new Date(),
                                event: 'add list',
                                stack: e.response.data,
                                message: 'failed to add list'
                            };
                            global.errorLists.push(error);
                        }
                        console.log('[CF SCRIPT ERROR]', e);
                    }
                }
            }
            //Delete from unblock queue
            if (ubQueue.length > 0) {
                for (const ip of ubQueue) {
                    const id = getIDByIP(ip);
                    if (id) {
                        if (toRemove.indexOf(id) < 0) {
                            let add = {
                                id: id
                            };
                            toRemove.push(add);
                        }
                        let index = ubQueue.indexOf(ip);
                        if (index >= 0) {
                            ubQueue.splice(index, 1);
                        }
                    }
                }
                if (toRemove.length > 0) {
                    try {
                        let result = yield axios_1.default.delete(`https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/rules/lists/${process.env.LIST_ID}/items`, {
                            headers: {
                                'X-Auth-Email': process.env.AUTH_EMAIL,
                                'X-Auth-Key': process.env.AUTH_KEY,
                                'Content-Type': 'application/json'
                            },
                            data: JSON.stringify({
                                items: toRemove
                            })
                        });
                        if (result.data.success) {
                            global.unBlockQueue = ubQueue;
                            console.log('[CF] Unblocked:', toRemove.length);
                        }
                        else {
                            const error = {
                                dt: new Date(),
                                event: 'delete list',
                                stack: result.data,
                                message: 'failed to delete list'
                            };
                            global.errorLists.push(error);
                            console.log('[CF] Error: ', result.data.errors);
                        }
                    }
                    catch (e) {
                        const error = {
                            dt: new Date(),
                            event: 'delete list',
                            stack: e.stack,
                            message: 'failed to delete list'
                        };
                        global.errorLists.push(error);
                        if (e.response) {
                            const error = {
                                dt: new Date(),
                                event: 'add list',
                                stack: e.response.data,
                                message: 'failed to add list'
                            };
                            global.errorLists.push(error);
                        }
                        console.log('[CF SCRIPT ERROR]', e);
                    }
                }
            }
        }), parseInt(process.env.INTERVAL_TIME));
    });
}
catch (error) {
    console.error(`[HTTP] Error occured: ${error.message}`);
}
function getIDByIP(ip) {
    var _a;
    let id = (_a = global.allblockList.find((x) => x.ip === ip)) === null || _a === void 0 ? void 0 : _a.id;
    // console.log('[CF] Get ID:', ip, id);
    return id;
}
//# sourceMappingURL=server.js.map