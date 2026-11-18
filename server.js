
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Database models. strict:false preserves the fields in your existing records.
const createModel = (name, collection) => {
    const schema = new mongoose.Schema({}, {
        strict: false,
        timestamps: false
    });
    return mongoose.model(name, schema, collection);
};

const Farmer = createModel("Farmer", "farmers");
const Buyer = createModel("Buyer", "buyers");
const Produce = createModel("Produce", "produce");
const Order = createModel("Order", "orders");
const MarketPrice = createModel("MarketPrice", "marketPrices");

// Generate the next ID, for example F011, B011 or O011.
async function nextRecordId(Model, field, prefix) {
    const records = await Model.find({
        [field]: new RegExp("^" + prefix + "\\d+$")
    }).select(field).lean();

    let highest = 0;

    records.forEach(record => {
        const number = parseInt(String(record[field]).replace(prefix, ""), 10);
        if (!Number.isNaN(number) && number > highest) highest = number;
    });

    return prefix + String(highest + 1).padStart(3, "0");
}

// A reusable set of CRUD routes for each collection.
function registerCrudRoutes(route, Model, options = {}) {
    const { idField, prefix, prepare } = options;

    app.get(`/api/${route}`, async (req, res) => {
        try {
            const records = await Model.find().sort({ _id: -1 }).lean();
            res.json(records);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    app.post(`/api/${route}`, async (req, res) => {
        try {
            const data = { ...req.body };

            if (prepare) await prepare(data);

            if (idField && prefix && !data[idField]) {
                data[idField] = await nextRecordId(Model, idField, prefix);
            }

            const record = new Model(data);
            await record.save();

            res.status(201).json(record);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

    app.put(`/api/${route}/:id`, async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: "Invalid record ID." });
            }

            const data = { ...req.body };
            if (prepare) await prepare(data);

            const updated = await Model.findByIdAndUpdate(
                req.params.id,
                { $set: data },
                { new: true, runValidators: true }
            );

            if (!updated) {
                return res.status(404).json({ message: "Record not found." });
            }

            res.json(updated);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

    app.delete(`/api/${route}/:id`, async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: "Invalid record ID." });
            }

            const deleted = await Model.findByIdAndDelete(req.params.id);

            if (!deleted) {
                return res.status(404).json({ message: "Record not found." });
            }

            res.json({ message: "Record deleted successfully." });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });
}

// Farmers
registerCrudRoutes("farmers", Farmer, {
    idField: "farmerId",
    prefix: "F",
    prepare: async data => {
        data.createdAt = data.createdAt || new Date();
    }
});

// Buyers
registerCrudRoutes("buyers", Buyer, {
    idField: "buyerId",
    prefix: "B",
    prepare: async data => {
        data.createdAt = data.createdAt || new Date();
    }
});

// Produce
registerCrudRoutes("produce", Produce, {
    prepare: async data => {
        data.name = data.name || data.produceName || data.crop || "";
        data.price = Number(data.price || 0);
        data.quantity = Number(data.quantity || data.availableQuantity || 0);
    }
});

// Orders
registerCrudRoutes("orders", Order, {
    idField: "orderId",
    prefix: "O",
    prepare: async data => {
        data.quantity = Number(data.quantity || 0);
        data.unitPrice = Number(data.unitPrice || 0);
        data.totalAmount = data.quantity * data.unitPrice;
        data.orderStatus = data.orderStatus || "Pending";
        data.orderDate = data.orderDate || new Date();
    }
});

// Market prices
registerCrudRoutes("market-prices", MarketPrice, {
    prepare: async data => {
        data.pricePerUnit = Number(data.pricePerUnit || 0);
        data.currency = data.currency || "UGX";
        data.recordedAt = data.recordedAt || new Date();
    }
});

// Dashboard statistics
app.get("/api/dashboard/stats", async (req, res) => {
    try {
        const [farmers, buyers, produce, orders] = await Promise.all([
            Farmer.countDocuments(),
            Buyer.countDocuments(),
            Produce.countDocuments(),
            Order.countDocuments()
        ]);

        res.json({ farmers, buyers, produce, orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start only after MongoDB connects successfully.
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error("MongoDB connection error:", error.message);
    });
