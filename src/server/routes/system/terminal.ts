import { FastifyInstance } from 'fastify/types/instance'
import { executeCommand } from '@plugin/core/system'
import { ChildProcess } from 'child_process'

export default async (fastify: FastifyInstance) => {
  // 终端
  fastify.get('/Terminal', { websocket: true }, async (connection) => {
    let childProcess: ChildProcess | null

    connection.on('message', (message: string) => {
      let data: any
      try {
        data = JSON.parse(message)
      } catch (error) {
        connection.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
        return
      }
      const { command, args, action, workingDirectory } = data

      if (action === 'execute') {
        if (childProcess) {
          childProcess.kill('SIGINT')
        }
        childProcess = executeCommand(command, args, connection, workingDirectory)
      }

      // 中断命令
      if (action === 'terminate' && childProcess) {
        childProcess.kill('SIGINT') // 发送中断信号
        childProcess = null // 清除子进程引用
        connection.send(JSON.stringify({ type: 'terminated', content: '命令已中断' }))
      }

      // 心跳
      if (action === 'ping') {
        connection.send(JSON.stringify({ type: 'ping', content: 'pong' }))
      }

    })

    connection.on('close', () => {
      if (childProcess) {
        childProcess.kill('SIGINT')
        childProcess = null
      }
    })
    connection.on('error', () => {
      if (childProcess) {
        childProcess.kill('SIGINT')
        childProcess = null
      }
    })

  })
}
