import { browser } from 'k6/browser'
import { check } from 'k6'
import { Counter, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173'
const DB_NAME = __ENV.DB_NAME || 'todo-app-db'
const addTaskDuration = new Trend('todo_add_task_duration_ms')
const editTaskDuration = new Trend('todo_edit_task_duration_ms')
const deleteTaskDuration = new Trend('todo_delete_task_duration_ms')
const completedWorkflows = new Counter('todo_completed_workflows')

export const options = {
  scenarios: {
    todo_browser_users: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 1 },
        { duration: '10s', target: 2 },
        { duration: '10s', target: 3 },
        { duration: '5s', target: 0 },
      ],
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate>0.95'],
  },
}

function verify(condition, message) {
  check(condition, { [message]: (value) => value === true })

  if (!condition) {
    throw new Error(message)
  }
}

async function readObjectStore(page, databaseName, storeName) {
  return page.evaluate(
    ({ name, store }) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(name)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result

          if (!database.objectStoreNames.contains(store)) {
            database.close()
            resolve([])
            return
          }

          const transaction = database.transaction(store, 'readonly')
          const recordsRequest = transaction.objectStore(store).getAll()

          recordsRequest.onsuccess = () => resolve(recordsRequest.result)
          recordsRequest.onerror = () => reject(recordsRequest.error)
          transaction.oncomplete = () => database.close()
        }
      }),
    { name: databaseName, store: storeName },
  )
}

export default async function () {
  const page = await browser.newPage()

  try {
    await page.goto(BASE_URL)
    await page.locator('.task-list').waitFor({ state: 'visible' })
    await page.evaluate(
      (databaseName) =>
        new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(databaseName)
          request.onsuccess = () => resolve(true)
          request.onerror = () => reject(request.error)
          request.onblocked = () => reject(new Error('IndexedDB est bloquée.'))
        }),
      DB_NAME,
    )
    await page.reload()
    await page.locator('.project-list .empty-state').waitFor({ state: 'visible' })

    const projectName = `K6-VU-${__VU}-ITER-${__ITER}`
    const taskTitle = `Tâche-${__VU}-${__ITER}`
    const editedTaskTitle = `${taskTitle}-modifiée`

    await page.locator('[data-testid="project-name"]').fill(projectName)
    await page.locator('[data-testid="add-project"]').click()
    await page.locator('[data-testid="task-title-input"]').waitFor({ state: 'visible' })

    const addStartedAt = Date.now()
    await page.locator('[data-testid="task-title-input"]').fill(taskTitle)
    await page.locator('[data-testid="task-title-input"]').press('Enter')
    const taskTitleLocator = page.locator('[data-testid="task-title"]')
    await taskTitleLocator.waitFor({ state: 'visible' })
    verify((await taskTitleLocator.textContent())?.trim() === taskTitle, 'La tâche ajoutée doit être affichée')
    addTaskDuration.add(Date.now() - addStartedAt)

    const projects = await readObjectStore(page, DB_NAME, 'projects')
    const tasks = await readObjectStore(page, DB_NAME, 'tasks')
    verify(projects.length === 1, 'Chaque navigateur doit avoir sa propre base de projets')
    verify(
      tasks.length === 1 && tasks[0].title === taskTitle,
      'La tâche doit être enregistrée dans IndexedDB',
    )

    await page.reload()
    await taskTitleLocator.waitFor({ state: 'visible' })
    verify((await taskTitleLocator.textContent())?.trim() === taskTitle, 'La tâche doit rester présente après rechargement')

    const editStartedAt = Date.now()
    await page.locator('[data-testid="edit-task"]').click()
    await page.locator('[data-testid="edit-task-input"]').fill(editedTaskTitle)
    await page.locator('[data-testid="save-task"]').click()
    await taskTitleLocator.waitFor({ state: 'visible' })
    verify((await taskTitleLocator.textContent())?.trim() === editedTaskTitle, 'La modification doit être affichée')
    editTaskDuration.add(Date.now() - editStartedAt)

    await page.locator('[data-testid="task-checkbox"]').click()
    await page.locator('[data-testid="task-item"].completed').waitFor({ state: 'visible' })

    await page.reload()
    await taskTitleLocator.waitFor({ state: 'visible' })
    verify((await taskTitleLocator.textContent())?.trim() === editedTaskTitle, 'La tâche modifiée doit rester après rechargement')
    const persistedTasks = await readObjectStore(page, DB_NAME, 'tasks')
    verify(
      persistedTasks.length === 1 &&
        persistedTasks[0].title === editedTaskTitle &&
        persistedTasks[0].completed === true,
      'La modification et le statut terminé doivent persister dans IndexedDB',
    )

    const deleteStartedAt = Date.now()
    await page.locator('[data-testid="delete-task"]').click()
    await page.locator('[data-testid="task-item"]').waitFor({ state: 'detached' })
    const remainingTasks = await readObjectStore(page, DB_NAME, 'tasks')
    verify(remainingTasks.length === 0, 'La suppression doit retirer la tâche d’IndexedDB')
    deleteTaskDuration.add(Date.now() - deleteStartedAt)
    completedWorkflows.add(1)
  } finally {
    await page.close()
  }
}
