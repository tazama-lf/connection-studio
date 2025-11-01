interface SftpFile {
  type: string;
  name: string;
  size: number;
  modifyTime: number;
  accessTime: number;
  rights: {
    user: string;
    group: string;
    other: string;
  };
  owner: number;
  group: number;
  longname: string;
}

export { type SftpFile };
