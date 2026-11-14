import React, { useEffect, useMemo, useState } from 'react'
import { deleteFromStore, readStore, writeStore } from './lib/db'
import './App.css'

const createId = (prefix) => {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return `${prefix}-${randomPart}`
}

function App() {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editedTaskTitle, setEditedTaskTitle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const currentProject = projects.find((project) => project.id === selectedProjectId) ?? null

  const loadData = async () => {
    try {
      const [projectList, taskList] = await Promise.all([
        readStore('projects'),
        readStore('tasks'),
      ])

      setProjects(projectList)
      setTasks(taskList)

      if (projectList.length > 0) {
        setSelectedProjectId((current) => {
          if (current && projectList.some((project) => project.id === current)) {
            return current
          }

          return projectList[0].id
        })
      } else {
        setSelectedProjectId('')
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const projectTasks = useMemo(
    () => tasks.filter((task) => task.projectId === selectedProjectId),
    [selectedProjectId, tasks],
  )

  const handleAddProject = async (event) => {
    event.preventDefault()
    const trimmed = projectName.trim()

    if (!trimmed) {
      setError('Le nom du projet est obligatoire.')
      return
    }

    const newProject = {
      id: createId('project'),
      name: trimmed,
    }

    try {
      await writeStore('projects', newProject)
      setProjects((current) => [...current, newProject])
      setSelectedProjectId(newProject.id)
      setProjectName('')
      setError('')
    } catch (err) {
      setError(err.message || 'Impossible d\'ajouter le projet.')
    }
  }

  const handleAddTask = async (event) => {
    event.preventDefault()

    if (!selectedProjectId) {
      setError('Sélectionne d\'abord un projet.')
      return
    }

    const trimmed = taskTitle.trim()

    if (!trimmed) {
      setError('Le titre de la tâche est obligatoire.')
      return
    }

    const newTask = {
      id: createId('task'),
      projectId: selectedProjectId,
      title: trimmed,
      completed: false,
      createdAt: Date.now(),
    }

    try {
      await writeStore('tasks', newTask)
      setTasks((current) => [newTask, ...current])
      setTaskTitle('')
      setError('')
    } catch (err) {
      setError(err.message || 'Impossible d\'ajouter la tâche.')
    }
  }

  const handleToggleTask = async (task) => {
    const updatedTask = { ...task, completed: !task.completed }

    try {
      await writeStore('tasks', updatedTask)
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updatedTask : item)),
      )
    } catch (err) {
      setError(err.message || 'Impossible de mettre à jour la tâche.')
    }
  }

  const handleEditTask = async (task) => {
    const trimmed = editedTaskTitle.trim()

    if (!trimmed) {
      setError('Le titre ne peut pas être vide.')
      return
    }

    const updatedTask = { ...task, title: trimmed }

    try {
      await writeStore('tasks', updatedTask)
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updatedTask : item)),
      )
      setEditingTaskId(null)
      setEditedTaskTitle('')
      setError('')
    } catch (err) {
      setError(err.message || 'Impossible de modifier la tâche.')
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteFromStore('tasks', taskId)
      setTasks((current) => current.filter((task) => task.id !== taskId))

      if (editingTaskId === taskId) {
        setEditingTaskId(null)
        setEditedTaskTitle('')
      }
    } catch (err) {
      setError(err.message || 'Impossible de supprimer la tâche.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">TP React</p>
          <h1>ToDo par projets</h1>
        </div>
      </header>

      <main className="layout">
        <aside className="panel project-panel">
          <h2>Projets</h2>

          <form onSubmit={handleAddProject} className="inline-form">
            <label htmlFor="projectName">Nom du projet</label>
            <div className="input-row">
              <input
                id="projectName"
                data-testid="project-name"
                type="text"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Ex. Travail"
              />
              <button type="submit" data-testid="add-project">Ajouter le projet</button>
            </div>
          </form>

          <ul className="project-list">
            {projects.length === 0 ? (
              <li className="empty-state">Aucun projet pour le moment.</li>
            ) : (
              projects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    data-testid="project-item"
                    className={
                      project.id === selectedProjectId
                        ? 'project-button active'
                        : 'project-button'
                    }
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    {project.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="panel task-panel">
          <div className="task-header">
            <h2>{currentProject?.name || 'Choisir un projet'}</h2>
          </div>

          <form onSubmit={handleAddTask} className="inline-form">
            <label htmlFor="taskTitle">Nouvelle tâche</label>
            <div className="input-row">
              <input
                id="taskTitle"
                data-testid="task-title-input"
                type="text"
                value={taskTitle}
                disabled={!selectedProjectId}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Ex. Rédiger le rapport"
              />
              <button type="submit" disabled={!selectedProjectId}>
                Ajouter la tâche
              </button>
            </div>
          </form>

          {error && <p className="message error">{error}</p>}

          {loading ? (
            <p className="message">Chargement...</p>
          ) : (
            <ul className="task-list">
              {projectTasks.length === 0 ? (
                <li className="empty-state">Aucune tâche dans ce projet.</li>
              ) : (
                projectTasks.map((task) => (
                  <li
                    key={task.id}
                    data-testid="task-item"
                    className={task.completed ? 'task-item completed' : 'task-item'}
                  >
                    <div className="task-main">
                      <input
                        type="checkbox"
                        data-testid="task-checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task)}
                        aria-label={`Valider la tâche ${task.title}`}
                      />

                      {editingTaskId === task.id ? (
                        <div className="edit-box">
                          <label htmlFor={`edit-task-${task.id}`}>Modifier la tâche</label>
                          <input
                            id={`edit-task-${task.id}`}
                            data-testid="edit-task-input"
                            type="text"
                            value={editedTaskTitle}
                            onChange={(event) => setEditedTaskTitle(event.target.value)}
                          />
                          <div className="task-actions">
                            <button
                              type="button"
                              data-testid="save-task"
                              onClick={() => handleEditTask(task)}
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setEditingTaskId(null)}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="task-title" data-testid="task-title">
                          {task.title}
                        </span>
                      )}
                    </div>

                    {editingTaskId !== task.id && (
                      <div className="task-actions">
                        <button
                          type="button"
                          data-testid="edit-task"
                          onClick={() => {
                            setEditingTaskId(task.id)
                            setEditedTaskTitle(task.title)
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          data-testid="delete-task"
                          className="danger"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
