import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { resetMemoryStores } from './lib/db'

describe('ToDo app', () => {
  beforeEach(() => {
    resetMemoryStores()
  })

  it('allows creating a project and adding a task to it', async () => {
    const user = userEvent.setup()
    render(<App />)

    const projectInput = screen.getByLabelText(/nom du projet/i)
    await user.clear(projectInput)
    await user.type(projectInput, 'Travail')
    await user.click(screen.getByRole('button', { name: /ajouter le projet/i }))

    expect(screen.getByRole('button', { name: 'Travail' })).toBeInTheDocument()

    const taskInput = screen.getByLabelText(/nouvelle tâche/i)
    await user.clear(taskInput)
    await user.type(taskInput, 'Rédiger le rapport')
    await user.click(screen.getByRole('button', { name: /ajouter la tâche/i }))

    expect(screen.getByText('Rédiger le rapport')).toBeInTheDocument()
  })

  it('allows editing a task', async () => {
    const user = userEvent.setup()
    render(<App />)

    const projectInput = screen.getByLabelText(/nom du projet/i)
    await user.type(projectInput, 'Maison')
    await user.click(screen.getByRole('button', { name: /ajouter le projet/i }))

    const taskInput = screen.getByLabelText(/nouvelle tâche/i)
    await user.type(taskInput, 'Faire les courses')
    await user.click(screen.getByRole('button', { name: /ajouter la tâche/i }))

    await user.click(screen.getByRole('button', { name: /modifier/i }))
    const editInput = screen.getByLabelText(/modifier la tâche/i)
    await user.clear(editInput)
    await user.type(editInput, 'Faire les courses pour la semaine')
    await user.click(screen.getByRole('button', { name: /enregistrer/i }))

    expect(screen.getByText('Faire les courses pour la semaine')).toBeInTheDocument()
  })
})
