import type { FastifyInstance } from 'fastify'
import {
  createSnapshot,
  getHistory,
  getVersion,
  diffVersions,
  diffWithCurrent,
  rollback,
  deleteVersion,
} from '../versioning/store.js'
import { invalidateCache } from './skills.js'

export async function versionRoutes(app: FastifyInstance) {
  // 创建快照
  app.post<{
    Body: { skillPath: string; skillName: string; message: string }
  }>('/api/versions/snapshot', async (req) => {
    const { skillPath, skillName, message } = req.body
    try {
      const meta = await createSnapshot(skillPath, skillName, message, 'manual')
      return { ok: true, version: meta }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  // 获取版本历史
  app.get<{
    Querystring: { skillPath: string }
  }>('/api/versions/history', async (req) => {
    const { skillPath } = req.query
    const history = await getHistory(skillPath)
    return { history }
  })

  // 获取某个版本的完整内容
  app.get<{
    Querystring: { skillPath: string; versionId: string }
  }>('/api/versions/detail', async (req) => {
    const { skillPath, versionId } = req.query
    const version = await getVersion(skillPath, versionId)
    if (!version) return { ok: false, error: 'Version not found' }
    return { ok: true, version }
  })

  // 对比两个版本
  app.get<{
    Querystring: { skillPath: string; oldId: string; newId: string }
  }>('/api/versions/diff', async (req) => {
    const { skillPath, oldId, newId } = req.query
    const diff = await diffVersions(skillPath, oldId, newId)
    if (!diff) return { ok: false, error: 'Diff failed' }
    return { ok: true, diff }
  })

  // 对比某个版本和当前文件
  app.get<{
    Querystring: { skillPath: string; versionId: string }
  }>('/api/versions/diff-current', async (req) => {
    const { skillPath, versionId } = req.query
    const diff = await diffWithCurrent(skillPath, versionId)
    if (!diff) return { ok: false, error: 'Diff failed' }
    return { ok: true, diff }
  })

  // 回滚到指定版本
  app.post<{
    Body: { skillPath: string; versionId: string }
  }>('/api/versions/rollback', async (req) => {
    const { skillPath, versionId } = req.body
    const success = await rollback(skillPath, versionId)
    if (!success) return { ok: false, error: 'Rollback failed' }
    invalidateCache()
    return { ok: true }
  })

  // 删除版本
  app.delete<{
    Querystring: { skillPath: string; versionId: string }
  }>('/api/versions', async (req) => {
    const { skillPath, versionId } = req.query
    const success = await deleteVersion(skillPath, versionId)
    return { ok: success }
  })
}
