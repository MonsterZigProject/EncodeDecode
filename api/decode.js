const { Interface } = require("ethers");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Use POST" });
      return;
    }

    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { functionName, data, abi: abiFromReq } = JSON.parse(body);

        // Pakai ABI dari request jika ada, kalau tidak fallback ke ENV
        const abi = abiFromReq || JSON.parse(process.env.ABI_JSON || "[]");
        const iface = new Interface(abi);

        if (!functionName || !data) {
          res.status(400).json({ error: "Provide functionName and data" });
          return;
        }

        // Ambil definisi fungsi
        const fnFragment = iface.getFunction(functionName);

        // Decode hasil eth_call
        const decoded = iface.decodeFunctionResult(fnFragment, data);

        // Auto-format output sesuai tipe ABI
        const formattedArgs = fnFragment.outputs.map((output, idx) => {
          const value = decoded[idx];
          if (output.type.includes("tuple")) return Array.isArray(value) ? [...value] : value;
          if (output.type === "address") return value.toString();
          if (output.type.endsWith("[]")) return Array.isArray(value) ? [...value] : value;
          return value;
        });

        // Bungkus ke [[...]] seperti [[address, comment]]
        res.status(200).json({
          functionName,
          args: [formattedArgs]
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
