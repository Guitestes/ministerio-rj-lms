import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceProvider } from "@/services/serviceProviderService";
import { toast } from "sonner";

interface ServiceProviderFormProps {
  initialData?: ServiceProvider;
  onSubmit: (data: ServiceProvider) => void;
}

const ServiceProviderForm = ({ initialData, onSubmit }: ServiceProviderFormProps) => {
  const [formData, setFormData] = useState<ServiceProvider>({
    name: '',
    service_type: '',
    contact_person: '',
    email: '',
    phone: '',
    service_category: '',
    service_subcategory: '',
    company_data: {},
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        company_data: initialData.company_data ? JSON.stringify(initialData.company_data, null, 2) : '',
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Attempt to parse company_data back to JSON before submitting
      const dataToSubmit = { ...formData };
      if (typeof dataToSubmit.company_data === 'string' && dataToSubmit.company_data.trim()) {
        dataToSubmit.company_data = JSON.parse(dataToSubmit.company_data);
      }
      onSubmit(dataToSubmit);
    } catch (error) {
      toast.error("Dados da Empresa (JSON) inválido. Por favor, corrija.");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initialData ? "Edit" : "Create"} Service Provider</DialogTitle>
        <DialogDescription>
          Fill in the details of the service provider.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="service_type">Service Type</Label>
          <Input id="service_type" name="service_type" value={formData.service_type} onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_person">Contact Person</Label>
          <Input id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service_category">Categoria</Label>
            <Input id="service_category" name="service_category" value={formData.service_category} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service_subcategory">Subcategoria</Label>
            <Input id="service_subcategory" name="service_subcategory" value={formData.service_subcategory} onChange={handleInputChange} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_data">Dados da Empresa (JSON)</Label>
          <Textarea
            id="company_data"
            name="company_data"
            value={formData.company_data}
            onChange={handleInputChange}
            rows={4}
            placeholder='{ "cnpj": "00.000.000/0001-00", "address": "Rua Exemplo, 123" }'
          />
        </div>
        <DialogFooter>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default ServiceProviderForm;
