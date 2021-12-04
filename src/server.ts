require('dotenv').config()
import express, { Application, Request, Response } from "express";
import axios from "axios";
import func from './request';
import cfBlockedData from "interfaces/cfBlockedData";
import errorReport from "interfaces/errorReport";
const app: Application = express();
const port = 3000;
let isFinished = true;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(func);
try {
    if (!process.env.INTERVAL_TIME) {
        console.log('INTERVAL_TIME is not defined');
        process.exit(1);
    }
    app.listen(port, (): void => {
        console.log(`[HTTP] Service started at port: ${port}`);
        (global as any).blockQueue = [];
        (global as any).unBlockQueue = [];
        (global as any).allblockList = [];
        (global as any).errorLists = [];
        (global as any).totalSubmit = 0;
        setInterval(async () => {
            if (!isFinished) return;
            let cursor: any = undefined;
            let list: any = [];
            isFinished = false;
            console.log('[CF] Starting load blocklist...')
            while (!isFinished) {
                await new Promise(r => setTimeout(r, 300));
                let blockedList = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/rules/lists/${process.env.LIST_ID}/items${cursor ? `?cursor=${cursor}` : ''}`, {
                    headers: {
                        'X-Auth-Email': process.env.AUTH_EMAIL as string,
                        'X-Auth-Key': process.env.AUTH_KEY as string,
                        'Content-Type': 'application/json'
                    }
                });
                cursor = blockedList.data.result_info?.cursors?.after;
                isFinished = cursor == null || typeof cursor == 'undefined';
                for (const recive of blockedList.data.result) {
                    list.push(recive);
                }
                // console.log('[CF] total blocked list:', list.length, '| Next:', cursor || 'none');
                if (isFinished) break;
            }
            (global as any).allblockList = list;
            console.log('[CF] All blocklist loaded: ', (global as any).allblockList.length);
        }, parseInt(process.env.LIST_INTERVAL_TIME as string));

        setInterval(async () => {
            let toAdd: string[] = [];
            let toRemove: string[] = [];
            let ubQueue = (global as any).unBlockQueue.slice();
            let bQueue = (global as any).blockQueue.slice();
            if (bQueue.length > 0) {
                for (const ip of bQueue) {
                    if (ip.includes(':')) continue;
                    toAdd.push({
                        ip: ip,
                        comment: 'blocked by burstwall at ' + new Date().getTime()
                    } as any)
                    let index = bQueue.indexOf(ip);
                    if (index >= 0) {
                        bQueue.splice(index, 1);
                    }
                }
                if (toAdd.length > 0) {
                    //Create list
                    try {
                        let result = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/rules/lists/${process.env.LIST_ID}/items`, JSON.stringify(toAdd), {
                            headers: {
                                'X-Auth-Email': process.env.AUTH_EMAIL as string,
                                'X-Auth-Key': process.env.AUTH_KEY as string,
                                'Content-Type': 'application/json'
                            },
                            data: JSON.stringify(toAdd)
                        });
                        if (result.data.success) {
                            (global as any).blockQueue = bQueue;
                            console.log('[CF] Blocked:', toAdd.length);
                        } else {
                            const error: errorReport = {
                                dt: new Date(),
                                event: 'add list',
                                stack: result.data,
                                message: 'failed to add list'
                            };
                            (global as any).errorLists.push(error);
                            console.log('[CF] Error: ', result.data.errors);
                        }
                    } catch (e: any) {
                        const error: errorReport = {
                            dt: new Date(),
                            event: 'add list',
                            stack: e.stack,
                            message: 'failed to add list'
                        };
                        (global as any).errorLists.push(error);
                        if (e.response) {
                            const error: errorReport = {
                                dt: new Date(),
                                event: 'add list',
                                stack: e.response.data,
                                message: 'failed to add list'
                            };
                            (global as any).errorLists.push(error);
                        }
                        console.log('[CF SCRIPT ERROR]', e);
                    }
                }
            }

            //Delete from unblock queue
            if (ubQueue.length > 0) {
                for (const ip of ubQueue) {
                    if (ip.includes(':')) continue;
                    const id = getIDByIP(ip);
                    if (id) {
                        if (toRemove.indexOf(id) < 0) {
                            let add: any = {
                                id: id
                            }
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
                        let result = await axios.delete(`https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/rules/lists/${process.env.LIST_ID}/items`, {
                            headers: {
                                'X-Auth-Email': process.env.AUTH_EMAIL as string,
                                'X-Auth-Key': process.env.AUTH_KEY as string,
                                'Content-Type': 'application/json'
                            },
                            data: JSON.stringify({
                                items: toRemove
                            })
                        });
                        if (result.data.success) {
                            (global as any).unBlockQueue = ubQueue;
                            console.log('[CF] Unblocked:', toRemove.length);
                        } else {
                            const error: errorReport = {
                                dt: new Date(),
                                event: 'delete list',
                                stack: result.data,
                                message: 'failed to delete list'
                            };
                            (global as any).errorLists.push(error);
                            console.log('[CF] Error: ', result.data.errors);
                        }
                    } catch (e: any) {
                        const error: errorReport = {
                            dt: new Date(),
                            event: 'delete list',
                            stack: e.stack,
                            message: 'failed to delete list'
                        };
                        (global as any).errorLists.push(error);
                        if (e.response) {
                            const error: errorReport = {
                                dt: new Date(),
                                event: 'add list',
                                stack: e.response.data,
                                message: 'failed to add list'
                            };
                            (global as any).errorLists.push(error);
                        }
                        console.log('[CF SCRIPT ERROR]', e);
                    }
                }
            }
        }, parseInt(process.env.INTERVAL_TIME as string));
    });
} catch (error: any) {
    console.error(`[HTTP] Error occured: ${error.message}`);
}

function getIDByIP(ip: string): string {
    let id = (global as any).allblockList.find((x: cfBlockedData) => x.ip === ip)?.id;
    // console.log('[CF] Get ID:', ip, id);
    return id;
}