/**
 * Detecta se o fix do achado foi aplicado no PR (Para/De/indicadores).
 */

import {
  extractCodeIndicators,
  snippetInFile,
} from "./extract.js";
import {
  gitLogCommits,
  gitShow,
  snippetEverInCommitRange,
  type ListCommitsFn,
  type ShowFileFn,
} from "./git.js";

export function fixAppliedInPr(
  project: string,
  args: {
    baseOid: string;
    headOid: string;
    mergeOid: string;
    filePath: string;
    line: number;
    deCode: string;
    paraCode: string;
    body: string;
    showFile?: ShowFileFn;
    listCommits?: ListCommitsFn;
  }
): [boolean, string] {
  const showFile = args.showFile ?? gitShow;
  const listCommits = args.listCommits ?? gitLogCommits;
  let fileMerge = args.mergeOid
    ? showFile(project, args.mergeOid, args.filePath)
    : "";
  if (!fileMerge && args.headOid) {
    fileMerge = showFile(project, args.headOid, args.filePath);
  }

  if (
    args.paraCode &&
    fileMerge &&
    snippetInFile(fileMerge, args.paraCode, args.line)
  ) {
    return [true, "suggestion / Para aplicada no merge"];
  }

  if (args.deCode && fileMerge) {
    if (
      !snippetInFile(fileMerge, args.deCode, args.line) &&
      snippetEverInCommitRange(
        project,
        args.baseOid,
        args.headOid,
        args.filePath,
        args.deCode,
        args.line,
        { showFile, listCommits }
      )
    ) {
      return [true, "código De removido ou corrigido no PR"];
    }
  }

  for (const indicator of extractCodeIndicators(args.body)) {
    if (fileMerge && fileMerge.includes(indicator)) continue;
    if (
      snippetEverInCommitRange(
        project,
        args.baseOid,
        args.headOid,
        args.filePath,
        indicator,
        args.line,
        { showFile, listCommits }
      )
    ) {
      return [true, `indicador \`${indicator}\` removido no PR`];
    }
  }

  return [false, ""];
}
