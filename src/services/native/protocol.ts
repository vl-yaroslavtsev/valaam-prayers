import type { DownloadModuleId, DownloadProgress } from "@/services/download/types";
import type { ImageSize } from "@/services/api/DaysApi";

/**
 * Типы протокола нативного моста v1. Источник истины: docs/native-bridge-protocol.md
 */

export type NativeErrorCode =
  | "UNKNOWN_TABLE"
  | "INVALID_PARAMS"
  | "DB_ERROR"
  | "NETWORK"
  | "HTTP_ERROR"
  | "SECTIONS_NOT_READY"
  | "NOT_SUPPORTED"
  | "INTERNAL";

export type BridgeCapability = "db" | "download" | "autoUpdate" | "images" | "seed";

/**
 * applying: идёт блокирующий этап (индексы, разделы, раскраска), JS должен ждать.
 * importing: индексы готовы, модули (calendar, molitvoslov) догружаются в фоне через download.progress.
 */
export type SeedStatus = "applying" | "importing" | "completed" | "skipped" | "error";

export interface SeedState {
  status: SeedStatus;
  seedVersion: number | null;
  createdAt: string | null;
  error?: string;
}

export interface BridgeInfo {
  protocolVersion: number;
  platform: "android" | "ios";
  appVersion: string;
  capabilities: BridgeCapability[];
}

export const SUPPORTED_PROTOCOL_VERSION = 1;

export interface ModuleInfo {
  downloaded: boolean;
  downloadedBytes: number | null;
  estimatedBytes: number | null;
  lastSyncAt: string | null;
}

export interface AutoUpdateState {
  enabled: boolean;
  lastCheckAt: string | null;
  nextCheckAt: string | null;
  running: boolean;
}

export interface StorageInfo {
  offlineUsedBytes: number;
  freeBytes: number;
  totalBytes: number;
}

type ModuleParams = { moduleId: DownloadModuleId };

/** Карта методов: параметры и результат каждого вызова */
export interface RpcMethods {
  "bridge.getInfo": { params: Record<string, never>; result: BridgeInfo };

  "db.get": { params: { table: string; key: string | number }; result: object | null };
  "db.getMany": { params: { table: string; keys: (string | number)[] }; result: (object | null)[] };
  "db.getAll": { params: { table: string }; result: object[] };
  "db.put": { params: { table: string; item: object }; result: null };
  "db.putAll": { params: { table: string; items: object[] }; result: null };
  "db.delete": { params: { table: string; key: string | number }; result: null };
  "db.clear": { params: { table: string }; result: null };
  "db.count": { params: { table: string }; result: number };

  "download.getProgress": { params: ModuleParams; result: DownloadProgress | null };
  "download.getAllProgress": { params: Record<string, never>; result: DownloadProgress[] };
  "download.getModuleInfo": { params: ModuleParams; result: ModuleInfo };
  "download.saveEstimate": { params: ModuleParams & { bytes: number }; result: null };
  "download.getSize": {
    params: ModuleParams & { since?: string; options?: { imageSize?: ImageSize } };
    result: number;
  };
  "download.getUpdateSize": { params: ModuleParams; result: number | null };
  "download.start": {
    params: ModuleParams & { options?: { imageSize?: ImageSize } };
    result: { accepted: true };
  };
  "download.checkForUpdate": {
    params: ModuleParams & { since?: string };
    result: { accepted: boolean; started: boolean };
  };
  "download.cancel": { params: ModuleParams; result: null };
  "download.delete": { params: ModuleParams; result: null };
  "download.dismissError": { params: ModuleParams; result: null };
  "download.resumeInterrupted": { params: Record<string, never>; result: null };

  "autoUpdate.set": {
    params: { enabled: boolean };
    result: { enabled: boolean; lastCheckAt: string | null };
  };
  "autoUpdate.getState": { params: Record<string, never>; result: AutoUpdateState };

  "storage.getInfo": { params: Record<string, never>; result: StorageInfo };

  "seed.getState": { params: Record<string, never>; result: SeedState };
}

export type RpcMethod = keyof RpcMethods;

/** Карта событий нативка -> JS */
export interface RpcEvents {
  "download.progress": DownloadProgress;
  "seed.state": SeedState;
}

export type RpcEvent = keyof RpcEvents;

export interface RpcRequest {
  id: string;
  method: string;
  params: unknown;
}

export interface RpcErrorBody {
  code: NativeErrorCode | string;
  message: string;
}

export type RpcResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: RpcErrorBody };

export interface RpcEventMessage {
  event: string;
  data: unknown;
}
