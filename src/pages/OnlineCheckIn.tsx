import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, Clock, FileText, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const OnlineCheckIn = () => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [arrivalDate, setArrivalDate] = useState<Date>();
  const [departureDate, setDepartureDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    reservationNumber: "",
    propertyId: "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    numberOfGuests: "1",
    estimatedArrivalTime: "",
    idType: "",
    idNumber: "",
    nationality: "",
    address: "",
    specialRequests: "",
    acceptTerms: false,
  });

  const { data: properties } = useQuery({
    queryKey: ["properties-checkin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, location")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast({
        title: language === "ro" ? "Eroare" : "Error",
        description: language === "ro" 
          ? "Trebuie să accepți termenii și condițiile" 
          : "You must accept the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (!arrivalDate || !departureDate) {
      toast({
        title: language === "ro" ? "Eroare" : "Error",
        description: language === "ro" 
          ? "Selectează datele de sosire și plecare" 
          : "Please select arrival and departure dates",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call - in production, this would save to database
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSuccess(true);

    toast({
      title: language === "ro" ? "Check-in completat!" : "Check-in completed!",
      description: language === "ro"
        ? "Datele tale au fost trimise cu succes. Te așteptăm!"
        : "Your information has been submitted successfully. See you soon!",
    });
  };

  const dateLocale = language === "ro" ? ro : enUS;

  const arrivalTimes = [
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", 
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00"
  ];

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto text-center">
              <CardContent className="pt-12 pb-8">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  {language === "ro" ? "Check-in Completat!" : "Check-in Complete!"}
                </h1>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {language === "ro"
                    ? "Mulțumim! Datele tale au fost înregistrate. Vei primi un email de confirmare în curând."
                    : "Thank you! Your information has been registered. You will receive a confirmation email shortly."}
                </p>
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground">
                    {language === "ro" ? "Număr rezervare:" : "Reservation number:"}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {formData.reservationNumber || "N/A"}
                  </p>
                </div>
                <Button onClick={() => window.location.href = "/"}>
                  {language === "ro" ? "Înapoi la pagina principală" : "Back to homepage"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: language === 'ro' ? 'Oaspeți' : 'Guests', href: '/oaspeti' },
    { label: language === 'ro' ? 'Online Check-In' : 'Online Check-In' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={language === 'ro' ? 'Online Check-In' : 'Online Check-In'}
        description={language === 'ro' 
          ? 'Completează check-in-ul online pentru a economisi timp la sosire. Proces simplu și rapid.'
          : 'Complete your online check-in to save time on arrival. Simple and fast process.'}
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <PageBreadcrumb items={breadcrumbItems} className="mb-8" />
          
          {/* Header Section */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {language === "ro" ? "Online Check-In" : "Online Check-In"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {language === "ro"
                ? "Completează formularul de mai jos pentru a-ți accelera procesul de check-in la sosire"
                : "Fill out the form below to speed up your check-in process upon arrival"}
            </p>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-6 mb-10 max-w-4xl mx-auto">
            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <Clock className="w-6 h-6 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">
                  {language === "ro" ? "Economisești timp" : "Save time"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "ro"
                    ? "Check-in rapid la sosire"
                    : "Quick check-in upon arrival"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <FileText className="w-6 h-6 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">
                  {language === "ro" ? "Fără formulare" : "No paperwork"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "ro"
                    ? "Totul online, simplu și rapid"
                    : "Everything online, simple and fast"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <Users className="w-6 h-6 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">
                  {language === "ro" ? "Self check-in" : "Self check-in"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "ro"
                    ? "Primești codul de acces automat"
                    : "Receive your access code automatically"}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {language === "ro" ? "Informații rezervare" : "Reservation Information"}
              </CardTitle>
              <CardDescription>
                {language === "ro"
                  ? "Completează toate câmpurile obligatorii (*)"
                  : "Fill in all required fields (*)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Reservation Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reservationNumber">
                      {language === "ro" ? "Număr rezervare *" : "Reservation number *"}
                    </Label>
                    <Input
                      id="reservationNumber"
                      placeholder={language === "ro" ? "ex: RES-12345" : "e.g., RES-12345"}
                      value={formData.reservationNumber}
                      onChange={(e) => handleChange("reservationNumber", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="property">
                      {language === "ro" ? "Proprietate *" : "Property *"}
                    </Label>
                    <Select
                      value={formData.propertyId}
                      onValueChange={(value) => handleChange("propertyId", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === "ro" ? "Selectează proprietatea" : "Select property"} />
                      </SelectTrigger>
                      <SelectContent>
                        {properties?.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name} - {property.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === "ro" ? "Data sosire *" : "Arrival date *"}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !arrivalDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {arrivalDate
                            ? format(arrivalDate, "PPP", { locale: dateLocale })
                            : language === "ro" ? "Selectează data" : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={arrivalDate}
                          onSelect={setArrivalDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "ro" ? "Data plecare *" : "Departure date *"}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !departureDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {departureDate
                            ? format(departureDate, "PPP", { locale: dateLocale })
                            : language === "ro" ? "Selectează data" : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={departureDate}
                          onSelect={setDepartureDate}
                          disabled={(date) => date < (arrivalDate || new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Guest Info */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    {language === "ro" ? "Informații oaspete principal" : "Main guest information"}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guestName">
                        {language === "ro" ? "Nume complet *" : "Full name *"}
                      </Label>
                      <Input
                        id="guestName"
                        placeholder={language === "ro" ? "Prenume și nume" : "First and last name"}
                        value={formData.guestName}
                        onChange={(e) => handleChange("guestName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestEmail">Email *</Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.guestEmail}
                        onChange={(e) => handleChange("guestEmail", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestPhone">
                        {language === "ro" ? "Telefon *" : "Phone *"}
                      </Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        placeholder="+40 7XX XXX XXX"
                        value={formData.guestPhone}
                        onChange={(e) => handleChange("guestPhone", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numberOfGuests">
                        {language === "ro" ? "Număr oaspeți *" : "Number of guests *"}
                      </Label>
                      <Select
                        value={formData.numberOfGuests}
                        onValueChange={(value) => handleChange("numberOfGuests", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {language === "ro" ? (num === 1 ? "oaspete" : "oaspeți") : (num === 1 ? "guest" : "guests")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Arrival Time */}
                <div className="space-y-2">
                  <Label htmlFor="arrivalTime">
                    {language === "ro" ? "Ora estimată de sosire" : "Estimated arrival time"}
                  </Label>
                  <Select
                    value={formData.estimatedArrivalTime}
                    onValueChange={(value) => handleChange("estimatedArrivalTime", value)}
                  >
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder={language === "ro" ? "Selectează ora" : "Select time"} />
                    </SelectTrigger>
                    <SelectContent>
                      {arrivalTimes.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ID Info */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    {language === "ro" ? "Document de identitate" : "Identity document"}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="idType">
                        {language === "ro" ? "Tip document *" : "Document type *"}
                      </Label>
                      <Select
                        value={formData.idType}
                        onValueChange={(value) => handleChange("idType", value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === "ro" ? "Selectează" : "Select"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ci">
                            {language === "ro" ? "Carte de identitate" : "ID Card"}
                          </SelectItem>
                          <SelectItem value="passport">
                            {language === "ro" ? "Pașaport" : "Passport"}
                          </SelectItem>
                          <SelectItem value="driving">
                            {language === "ro" ? "Permis de conducere" : "Driving license"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idNumber">
                        {language === "ro" ? "Serie și număr *" : "ID number *"}
                      </Label>
                      <Input
                        id="idNumber"
                        placeholder={language === "ro" ? "ex: AB123456" : "e.g., AB123456"}
                        value={formData.idNumber}
                        onChange={(e) => handleChange("idNumber", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">
                        {language === "ro" ? "Naționalitate *" : "Nationality *"}
                      </Label>
                      <Input
                        id="nationality"
                        placeholder={language === "ro" ? "ex: Română" : "e.g., Romanian"}
                        value={formData.nationality}
                        onChange={(e) => handleChange("nationality", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="address">
                      {language === "ro" ? "Adresă de domiciliu *" : "Home address *"}
                    </Label>
                    <Input
                      id="address"
                      placeholder={language === "ro" ? "Strada, număr, oraș, țară" : "Street, number, city, country"}
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div className="space-y-2">
                  <Label htmlFor="specialRequests">
                    {language === "ro" ? "Cereri speciale (opțional)" : "Special requests (optional)"}
                  </Label>
                  <Textarea
                    id="specialRequests"
                    placeholder={language === "ro"
                      ? "ex: Sosire târzie, pat pentru copil, etc."
                      : "e.g., Late arrival, baby cot, etc."}
                    value={formData.specialRequests}
                    onChange={(e) => handleChange("specialRequests", e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Terms */}
                <div className="flex items-start space-x-3 pt-4 border-t">
                  <Checkbox
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => handleChange("acceptTerms", checked as boolean)}
                  />
                  <Label htmlFor="acceptTerms" className="text-sm leading-relaxed cursor-pointer">
                    {language === "ro"
                      ? "Sunt de acord cu termenii și condițiile și cu politica de confidențialitate. Confirm că datele introduse sunt corecte."
                      : "I agree to the terms and conditions and privacy policy. I confirm that the information provided is correct."}
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? (language === "ro" ? "Se trimite..." : "Submitting...")
                    : (language === "ro" ? "Finalizează Check-In" : "Complete Check-In")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <GlobalConversionWidgets showExitIntent={false} />
      <BackToTop />
    </div>
  );
};

export default OnlineCheckIn;
