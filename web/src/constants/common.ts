/*
 *  Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// TODO: Use standard BCP 47 language tag and display names
export enum LanguageAbbreviation {
  En = 'en',
  Zh = 'zh-Hans',
}

export const LanguageAbbreviationMap = {
  [LanguageAbbreviation.En]: 'English',
  [LanguageAbbreviation.Zh]: '简体中文',
};

export const LanguageTranslationMap = {
  English: 'en',
  Chinese: 'zh-Hans',
};

export enum FileMimeType {
  Bmp = 'image/bmp',
  Csv = 'text/csv',
  Odt = 'application/vnd.oasis.opendocument.text',
  Doc = 'application/msword',
  Docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  Gif = 'image/gif',
  Htm = 'text/htm',
  Html = 'text/html',
  Jpg = 'image/jpg',
  Jpeg = 'image/jpeg',
  Pdf = 'application/pdf',
  Png = 'image/png',
  Ppt = 'application/vnd.ms-powerpoint',
  Pptx = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  Tiff = 'image/tiff',
  Txt = 'text/plain',
  Xls = 'application/vnd.ms-excel',
  Xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  Mp4 = 'video/mp4',
  Json = 'application/json',
  Md = 'text/markdown',
  Mdx = 'text/mdx',
}

export const Domain = 'cloud.ragflow.io';

//#region file preview
export const Images = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tif',
  'tiff',
  'webp',
  // 'svg',
  'ico',
];

export const AudioExtensions = [
  'mp3',
  'wav',
  'wave',
  'aac',
  'flac',
  'ogg',
  'oga',
  'm4a',
  'wma',
  'aiff',
  'aif',
  'au',
  'midi',
  'opus',
  'ape',
  'amr',
];

export const VideoExtensions = [
  'mp4',
  'avi',
  'mov',
  'mkv',
  'wmv',
  'flv',
  'mpeg',
  'mpg',
  'asf',
  'rm',
  'rmvb',
];

// Without FileViewer
export const ExceptiveType = [
  'xlsx',
  'xls',
  'pdf',
  'docx',
  'md',
  'mdx',
  'txt',
  'csv',
  'pptx',
  'html',
  'htm',
  'epub',
  ...Images,
];

export const SupportedPreviewDocumentTypes = [...ExceptiveType];
//#endregion

export enum Platform {
  RAGFlow = 'RAGFlow',
  Dify = 'Dify',
  FastGPT = 'FastGPT',
  Coze = 'Coze',
}

export enum ThemeEnum {
  Dark = 'dark',
  Light = 'light',
  System = 'system',
}

export const DESCRIPTION_MAX_LENGTH = 512;
