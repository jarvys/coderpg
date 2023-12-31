interface File {
  path: string;
  url: string;
}

interface RepoFilesQuery {
  owner: string;
  repo: string;
  tag: string;
}

interface IRepoService {
  getFiles(query: RepoFilesQuery): Promise<File[]>;
  getFileContent(url: string): Promise<string>;
}

const token = process.env.GITHUB_TOKEN;

export class RepoService implements IRepoService {
  async getFiles(query: RepoFilesQuery): Promise<File[]> {
    const url = `https://api.github.com/repos/${query.owner}/${query.repo}/git/trees/${query.tag}?recursive=true`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `token ${token}`,
      },
    });
    const data = await res.json().catch(() => null);
    if (res.status !== 200) {
      throw new Error(data?.message || "github api error");
    }
    return data?.tree || [];
  }

  async getFileContent(url: string): Promise<string> {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `token ${token}`,
      },
    });
    const data = await res.json().catch(() => null);
    if (res.status !== 200) {
      throw new Error(data?.message || "github api error");
    }
    return atob(data.content);
  }
}
