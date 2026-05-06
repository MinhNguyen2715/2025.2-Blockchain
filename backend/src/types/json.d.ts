declare module '*.json' {
  const value: {
    abi: any[];
    bytecode?: string;
    deployedBytecode?: string;
    linkReferences?: any;
  };
  export default value;
}