import express, { Request, Response } from "express";
import cfBlockedData from "interfaces/cfBlockedData";
const router = express.Router();
router.get("/", (req: Request, res: Response): Response => {
    return res.status(200).send({
        success: true,
        message: "Burstwall is up and running",
        systemStats: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            totalCpuUsage: process.cpuUsage().system + process.cpuUsage().user,
            maxlisteners: process.getMaxListeners(),
        },
        wallStats: {
            blockQueue: (global as any).blockQueue.length,
            unBlockQueue: (global as any).unBlockQueue.length,
            errorsCount: (global as any).errorLists.length,
            // totalSubmit: (global as any).totalSubmit,
        },
        list: {
            loaded: (global as any).allblockList,
            error: (global as any).errorLists,
            block: (global as any).blockQueue,
            unBlock: (global as any).unBlockQueue,
        }
    });
}
);
router.get('/list/json', (req: Request, res: Response): Response => {
    let list = JSON.stringify((global as any).allblockList).slice();
    for(const item of (global as any).allblockList) {
        delete item.id;
    }
    return res.status(200).send(list);
})
router.get('/list/csv', (req: Request, res: Response): Response => {
    let list = (global as any).allblockList;
    let csv = 'ip,comment,created_on,modified_on\n';
    for(const item of list) {
        csv += `${item.ip},${item.comment || ''},${item.created_on},${item.modified_on}\n`;
    }
    return res.status(200).send(csv);
})
router.post("/", (req: Request, res: Response): Response => {
    let ip = req.query.ip;
    if (req.query.key != process.env.MODIFY_KEY) {
        return res.status(400).send({
            success: false,
            message: "Unauthorized"
        });
    }
    if (ip) {
        if ((ip as string).includes(":")) {
            return res.status(400).send({
                success: false,
                message: "v6 is not supported"
            });
        }
        let index = (global as any).blockQueue.findIndex((x: string) => x == ip);
        if (index >= 0) {
            return res.status(400).send({
                success: false,
                message: "This IP already in queue"
            });

        } else if ((global as any).allblockList.findIndex((x: cfBlockedData) => x.ip == ip) >= 0) {
            return res.status(400).send({
                success: false,
                message: "This IP already in list"
            });
        } else {
            // console.log('ip', ip);
            (global as any).blockQueue.push(ip);
            return res.status(200).send({ success: true, message: "Block list added" });
        }
    } else {
        return res.status(400).send({ success: false, message: "No ip provided" });
    }
}
);
router.delete("/", (req: Request, res: Response): Response => {
    let ip = req.query.ip;
    if (req.query.key != process.env.MODIFY_KEY) {
        return res.status(400).send({
            success: false,
            message: "Unauthorized"
        });
    }
    if (ip) {
        if ((ip as string).includes(":")) {
            return res.status(400).send({
                success: false,
                message: "v6 is not supported"
            });
        }
        let index = (global as any).unBlockQueue.findIndex((x: string) => x == ip);
        if (index >= 0) {
            return res.status(200).send({
                success: false,
                message: "This IP already in queue"
            });
        } else {
            (global as any).unBlockQueue.push(ip);
            return res.status(200).send({ success: true, message: "Remove list added" });
        }
    } else {
        return res.status(400).send({ success: false, message: "No ip provided" });
    }
}
);
export default router;