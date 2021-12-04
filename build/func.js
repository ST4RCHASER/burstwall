"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = (0, tslib_1.__importDefault)(require("express"));
const router = express_1.default.Router();
let blockQueue = [];
let unBlockQueue = [];
router.get("/", (req, res) => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
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
            blockQueue: blockQueue.length,
            unBlockQueue: unBlockQueue.length,
        }
    });
}));
exports.default = router;
//# sourceMappingURL=func.js.map