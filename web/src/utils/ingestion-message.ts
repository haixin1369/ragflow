/**
 * 后端在入库任务事件中持久化的是英文消息（见 internal/service/ingestion_task_service.go
 * 与 internal/ingestion/pipeline/pipeline.go）。产品当前仅面向中文用户，
 * 因此在展示层将已知模式翻译为中文，未识别的消息原样展示。
 */

import { TFunction } from 'i18next';

const fixedMessages: Record<string, string> = {
  'Task is queued...': '任务已排队...',
  'Task is running...': '任务正在执行...',
  'Task completed.': '任务已完成。',
  'Task failed.': '任务失败。',
  'Task stopped by user.': '任务已被用户停止。',
  'Task superseded by a new parse request.': '任务已被新的解析请求取代。',
  'Task publish failed.': '任务发布失败。',
};

const componentNames: Record<string, string> = {
  File: '文件读取',
  Parser: '解析',
  Extractor: '信息提取',
  Compiler: '知识编译',
  Tokenizer: '向量化',
  Indexer: '索引',
  GeneralChunker: '通用分块',
  TokenChunker: 'Token 分块',
  TitleChunker: '标题分块',
  ManualChunker: '手工分块',
  OneChunker: '单块分块',
  PageChunker: '页面分块',
  QAChunker: '问答分块',
  TableChunker: '表格分块',
  GroupTitleChunker: '分组标题分块',
  HierarchyTitleChunker: '层级标题分块',
};

const componentFailurePattern = /^(\S+) failed: (.*)$/s;
const runningProgressPattern =
  /^Task is running\.\.\. Progress: (\d+) \/ (\d+) pages$/;

export function translateIngestionMessage(message: string): string {
  if (!message) return message;
  if (message.includes('\n')) {
    return message
      .split('\n')
      .map(translateIngestionMessage)
      .join('\n');
  }

  const fixed = fixedMessages[message];
  if (fixed) return fixed;

  const progress = runningProgressPattern.exec(message);
  if (progress) {
    return `任务正在执行... 进度：${progress[1]} / ${progress[2]} 页`;
  }

  const failure = componentFailurePattern.exec(message);
  if (failure) {
    const name = componentNames[failure[1]];
    if (name) return `${name}失败：${failure[2]}`;
  }

  if (message.endsWith(' Started')) {
    const name = message.slice(0, -' Started'.length);
    return `${componentNames[name] ?? name}开始`;
  }
  if (message.endsWith(' Done')) {
    const name = message.slice(0, -' Done'.length);
    return `${componentNames[name] ?? name}完成`;
  }
  if (message.startsWith('Task failed: ')) {
    return `任务失败：${message.slice('Task failed: '.length)}`;
  }

  return message;
}

/**
 * 入库任务的运行状态文案。入参可以是 RunningStatus 枚举（UNSTART/DONE/...）
 * 或旧版数字状态（'0'..'5'），统一映射到 knowledgeDetails.runningStatus* 文案。
 */
const runningStatusNumericKeys: Record<string, string> = {
  UNSTART: '0',
  RUNNING: '1',
  CANCEL: '2',
  DONE: '3',
  FAIL: '4',
  SCHEDULE: 'Queued',
  QUEUED: 'Queued',
  '5': 'Queued',
};

export function getRunningStatusLabel(
  t: TFunction,
  status: string,
): string {
  const suffix = runningStatusNumericKeys[status] ?? status;
  return t(`knowledgeDetails.runningStatus${suffix}`);
}
