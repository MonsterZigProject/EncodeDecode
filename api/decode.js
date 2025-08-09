import { Interface } from "ethers";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Use POST" });
      return;
    }

    let body = "";
    for await (const chunk of req) body += chunk;

    const { functionName, data, abi: abiFromReq } = JSON.parse(body);

    const abi = abiFromReq || JSON.parse(process.env.ABI_JSON || "[]");
    const iface = new Interface(abi);

    if (!functionName || !data) {
      res.status(400).json({ error: "Provide functionName and data" });
      return;
    }

    const fnFragment = iface.getFunction(functionName);
    const decoded = iface.decodeFunctionResult(fnFragment, data);

    const formattedArgs = fnFragment.outputs.map((output, idx) => {
      const value = decoded[idx];
      if (output.type.includes("tuple")) return Array.isArray(value) ? [...value] : value;
      if (output.type === "address") return value.toString();
      if (output.type.endsWith("[]")) return Array.isArray(value) ? [...value] : value;
      return value;
    });

    res.status(200).json({
      functionName,
      args: [formattedArgs]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
