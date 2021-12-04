"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = (0, tslib_1.__importDefault)(require("express"));
const router = express_1.default.Router();
router.get("/", (req, res) => {
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
            blockQueue: global.blockQueue.length,
            unBlockQueue: global.unBlockQueue.length,
            errorsCount: global.errorLists.length,
            totalSubmit: global.totalSubmit,
        },
        list: {
            loaded: global.allblockList,
            error: global.errorLists,
            block: global.blockQueue,
            unBlock: global.unBlockQueue,
        }
    });
});
router.post("/", (req, res) => {
    let ip = req.query.ip;
    if (req.query.key != process.env.MODIFY_KEY) {
        return res.status(400).send({
            success: false,
            message: "Unauthorized"
        });
    }
    if (ip) {
        let index = global.blockQueue.findIndex((x) => x == ip);
        if (index >= 0) {
            return res.status(400).send({
                success: false,
                message: "This IP already in queue"
            });
        }
        else if (global.allblockList.findIndex((x) => x.ip == ip) >= 0) {
            return res.status(400).send({
                success: false,
                message: "This IP already in list"
            });
        }
        else {
            console.log('ip', ip);
            global.blockQueue.push(ip);
            return res.status(200).send({ success: true, message: "Block list added" });
        }
    }
    else {
        return res.status(400).send({ success: false, message: "No ip provided" });
    }
});
router.delete("/", (req, res) => {
    let ip = req.query.ip;
    if (req.query.key != process.env.MODIFY_KEY) {
        return res.status(400).send({
            success: false,
            message: "Unauthorized"
        });
    }
    if (ip) {
        let index = global.unBlockQueue.findIndex((x) => x == ip);
        if (index >= 0) {
            return res.status(200).send({
                success: false,
                message: "This IP already in queue"
            });
        }
        else {
            global.unBlockQueue.push(ip);
            return res.status(200).send({ success: true, message: "Remove list added" });
        }
    }
    else {
        return res.status(400).send({ success: false, message: "No ip provided" });
    }
});
exports.default = router;
//# sourceMappingURL=request.js.map