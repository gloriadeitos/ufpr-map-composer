declare module 'georaster' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseGeoraster: (input: any) => Promise<any>;
    export default parseGeoraster;
}
