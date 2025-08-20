import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { classService, courseService, profileService } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Edit, Trash, Users as UsersIcon } from 'lucide-react'
import type { Profile } from '@/types'
import type { ClassWithDetails } from '@/services/classService'

interface ClassFormState {
  id?: string
  name: string
  instructorId?: string
  startDate?: string
  endDate?: string
}

const emptyForm: ClassFormState = { name: '' }

const AdminClasses = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const [classes, setClasses] = useState<ClassWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState<null | string>(null)
  const [form, setForm] = useState<ClassFormState>(emptyForm)

  const title = useMemo(() => classes.length ? 'Turmas do Curso' : 'Nenhuma turma cadastrada', [classes])

  useEffect(() => {
    const load = async () => {
      if (!courseId) return
      setIsLoading(true)
      try {
        const [cls, profs] = await Promise.all([
          // Prefer new classService; fallback to courseService when needed
          classService.getClassesForCourse(courseId).catch(async () => await courseService.getClassesForCourse(courseId)),
          profileService.getProfiles(),
        ])
        setClasses(cls || [])
        setProfiles(profs || [])
      } catch (e) {
        console.error(e)
        toast.error('Falha ao carregar turmas e perfis')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [courseId])

  const resetAndClose = () => {
    setForm(emptyForm)
    setOpenForm(false)
  }

  const handleCreate = () => {
    setForm(emptyForm)
    setOpenForm(true)
  }

  const handleEdit = (c: ClassWithDetails) => {
    setForm({
      id: c.id,
      name: c.name,
      instructorId: c.instructorId,
      startDate: c.startDate?.slice(0, 10),
      endDate: c.endDate?.slice(0, 10),
    })
    setOpenForm(true)
  }

  const handleDeleteAsk = (id: string) => setOpenDelete(id)

  const handleDelete = async () => {
    if (!openDelete) return
    setIsDeleting(true)
    try {
      await classService.deleteClass(openDelete)
      setClasses(prev => prev.filter(c => c.id !== openDelete))
      toast.success('Turma excluída com sucesso')
    } catch (e) {
      console.error(e)
      toast.error('Falha ao excluir a turma')
    } finally {
      setIsDeleting(false)
      setOpenDelete(null)
    }
  }

  const saveDisabled = useMemo(() => {
    if (!form.name?.trim()) return true
    if (form.startDate && form.endDate && form.startDate > form.endDate) return true
    return false
  }, [form])

  const handleSubmit = async () => {
    if (!courseId) return
    setIsSaving(true)
    try {
      if (form.id) {
        const updated = await classService.updateClass(form.id, {
          name: form.name.trim(),
          instructorId: form.instructorId || undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        })
        setClasses(prev => prev.map(c => (c.id === updated.id ? updated : c)))
        toast.success('Turma atualizada com sucesso')
      } else {
        const created = await classService.createClass({
          courseId,
          name: form.name.trim(),
          instructorId: form.instructorId || undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        })
        setClasses(prev => [created, ...prev])
        toast.success('Turma criada com sucesso')
      }
      resetAndClose()
    } catch (e) {
      console.error(e)
      toast.error('Falha ao salvar a turma')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <p>Carregando turmas...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Turmas</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Turma
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>{cls.name}</TableCell>
                  <TableCell>{cls.instructorName || '-'}</TableCell>
                  <TableCell>{cls.startDate ? new Date(cls.startDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{cls.endDate ? new Date(cls.endDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/classes/${cls.id}/enrollments`)}>
                      <UsersIcon className="h-4 w-4 mr-2" /> Alunos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(cls)}>
                      <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteAsk(cls.id)}>
                      <Trash className="h-4 w-4 mr-2" /> Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma turma encontrada para este curso.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
            <DialogDescription>Preencha os detalhes da turma abaixo.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Professor (opcional)</Label>
              <Select value={form.instructorId || ''} onValueChange={(v) => setForm(prev => ({ ...prev, instructorId: v || undefined }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um professor" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name || 'Sem nome'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Início</Label>
              <Input id="start" type="date" value={form.startDate || ''} onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value || undefined }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Término</Label>
              <Input id="end" type="date" value={form.endDate || ''} onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value || undefined }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || saveDisabled}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!openDelete} onOpenChange={(o) => !o && setOpenDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default AdminClasses