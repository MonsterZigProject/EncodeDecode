// api/decode-tx.js
const { Interface } = require("ethers");

module.exports = async (req, res) => {
  try {
    const abi = JSON.parse(process.env.ABI_JSON || "[]");
    const iface = new Interface(abi);

    if (req.method !== "POST") {
      res.status(405).json({ error: "Use POST" });
      return;
    }

    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { data } = JSON.parse(body);
        if (!data) {
          res.status(400).json({ error: "Provide data" });
          return;
        }

        // Parse tx data
        const parsed = iface.parseTransaction({ data });

        // Dapatkan definisi fungsi dari ABI
        const fnFragment = iface.getFunction(parsed.name);

        // Ambil semua argumen sesuai tipe
        const formattedArgs = fnFragment.inputs.map((input, idx) => {
          const value = parsed.args[idx];
          // Kalau tipe tuple, convert ke array biasa
          if (input.type.includes("tuple")) {
            return Array.isArray(value) ? [...value] : value;
          }
          // Kalau tipe address, pastikan lowercase checksum
          if (input.type === "address") {
            return value.toString();
          }
          // Kalau tipe array, convert ke array biasa
          if (input.type.endsWith("[]")) {
            return Array.isArray(value) ? [...value] : value;
          }
          // Default: kembalikan nilai asli
          return value;
        });

        // Bungkus jadi [[...]]
        const nested = [formattedArgs];

        res.status(200).json({
          functionName: parsed.name,
          args: nested
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
