"use client"
import { useState, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, FileText, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"

interface AnalysisResult {
 linkedin_found: boolean
 professional_summary?: string
 core_competencies?: string
 career_progression?: string
 achievements_quantified?: string
 industry_positioning?: string
 leadership_experience?: string
 technical_skills?: string
 education_credentials?: string
 networking_strength?: string
 resume_strength_analysis?: string
 career_recommendations?: string
 market_value_assessment?: string
 improvement_areas?: string
 online_presence_recommendation?: string
 error?: string
}

export default function ResumeAnalyzer() {
 const [file, setFile] = useState<File | null>(null)
 const [loading, setLoading] = useState(false)
 const [result, setResult] = useState<AnalysisResult | null>(null)
 const [dragActive, setDragActive] = useState(false)
 const [uploadError, setUploadError] = useState<string>("")
 const fileInputRef = useRef<HTMLInputElement>(null)

 const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
 
 const validateFile = (uploadedFile: File): string | null => {
 if (uploadedFile.size > MAX_FILE_SIZE) {
 return "File size must be less than 10MB"
 }
 
 const isPdf = uploadedFile.type === "application/pdf" || uploadedFile.name.toLowerCase().endsWith('.pdf')
 const isDocx = uploadedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
 uploadedFile.name.toLowerCase().endsWith('.docx')
 
 if (!isPdf && !isDocx) {
 return "Please upload a PDF or DOCX file only"
 }
 
 return null
 }

 const extractTextFromFile = async (file: File): Promise<string> => {
 const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')
 
 if (isPdf) {
 try {
 // For PDF files, we'll use PDF.js with better error handling
 const pdfjsLib = await import('pdfjs-dist/build/pdf')
 
 // Set up the worker
 if (typeof window !== 'undefined') {
 pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
 }
 
 const arrayBuffer = await file.arrayBuffer()
 const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
 
 let fullText = ''
 for (let i = 1; i <= pdf.numPages; i++) {
 const page = await pdf.getPage(i)
 const content = await page.getTextContent()
 const pageText = content.items
 .map((item: any) => {
 if (typeof item === 'object' && item !== null && 'str' in item) {
 return item.str
 }
 return ''
 })
 .join(' ')
 fullText += pageText + ' '
 }
 
 return fullText.trim()
 } catch (pdfError) {
 console.error('PDF processing error:', pdfError)
 throw new Error('Could not process PDF file. The file may be corrupted or password-protected.')
 }
 } else {
 try {
 // For DOCX files, we'll use mammoth
 const mammoth = await import('mammoth')
 const arrayBuffer = await file.arrayBuffer()
 const result = await mammoth.extractRawText({ arrayBuffer })
 return result.value.trim()
 } catch (docxError) {
 console.error('DOCX processing error:', docxError)
 throw new Error('Could not process DOCX file. The file may be corrupted.')
 }
 }
 }

 const analyzeWithOpenAI = async (resumeText: string, hasLinkedIn: boolean): Promise<any> => {
 // Get API key from environment variables
 const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
 
 if (!OPENAI_API_KEY) {
 throw new Error('OpenAI API key not found in environment variables')
 }

 const basePrompt = `You are an expert career consultant and resume analyzer with 20+ years of experience in talent acquisition and career development.`
 
 const analysisPrompt = hasLinkedIn
 ? `${basePrompt}

Analyze this resume comprehensively.

RESUME CONTENT:
${resumeText}

Provide a comprehensive analysis in JSON format with these exact fields:
- professional_summary: A 2-3 sentence executive summary of this candidate's profile
- core_competencies: List of 5-8 key skills and areas of expertise
- career_progression: Analysis of career trajectory, growth patterns, and logical progression
- achievements_quantified: Specific accomplishments with numbers, percentages, or measurable impact
- industry_positioning: How this candidate positions within their industry/field
- leadership_experience: Examples of leadership, management, or team collaboration
- technical_skills: Relevant technical competencies, tools, software, or methodologies
- education_credentials: Educational background and any relevant certifications
- networking_strength: Assessment of professional network and online presence
- career_recommendations: 3-4 specific actionable recommendations for career advancement
- market_value_assessment: Estimated market positioning and competitive strengths
- improvement_areas: 2-3 areas where the candidate could strengthen their profile`
 : `${basePrompt}

Analyze this resume comprehensively.

RESUME CONTENT:
${resumeText}

Provide a detailed analysis in JSON format with these exact fields:
- professional_summary: A 2-3 sentence executive summary of this candidate's profile
- core_competencies: List of 5-8 key skills and areas of expertise 
- career_progression: Analysis of career trajectory, growth patterns, and logical progression
- achievements_quantified: Specific accomplishments with numbers, percentages, or measurable impact
- industry_positioning: How this candidate positions within their industry/field
- leadership_experience: Examples of leadership, management, or team collaboration
- technical_skills: Relevant technical competencies, tools, software, or methodologies
- education_credentials: Educational background and any relevant certifications
- resume_strength_analysis: Assessment of resume formatting, content quality, and presentation
- career_recommendations: 3-4 specific actionable recommendations for career advancement
- market_value_assessment: Estimated market positioning and competitive strengths
- improvement_areas: 2-3 areas where the candidate could strengthen their profile
- online_presence_recommendation: Suggestions for building digital presence and professional branding`

 const response = await fetch('https://api.openai.com/v1/chat/completions', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${OPENAI_API_KEY}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 model: 'gpt-4o-mini',
 messages: [{ role: 'user', content: analysisPrompt }],
 response_format: { type: 'json_object' },
 temperature: 0.3,
 max_tokens: 4000,
 }),
 })

 if (!response.ok) {
 const errorData = await response.json().catch(() => ({}))
 throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
 }

 const data = await response.json()
 const content = data.choices[0]?.message?.content
 
 if (!content) {
 throw new Error('No content received from OpenAI')
 }

 return JSON.parse(content)
 }

 const handleDrag = (e: React.DragEvent) => {
 e.preventDefault()
 e.stopPropagation()
 if (e.type === "dragenter" || e.type === "dragover") {
 setDragActive(true)
 } else if (e.type === "dragleave") {
 setDragActive(false)
 }
 }

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault()
 e.stopPropagation()
 setDragActive(false)
 setUploadError("")
 
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 const uploadedFile = e.dataTransfer.files[0]
 const error = validateFile(uploadedFile)
 
 if (error) {
 setUploadError(error)
 } else {
 setFile(uploadedFile)
 }
 }
 }

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 setUploadError("")
 
 if (e.target.files && e.target.files[0]) {
 const uploadedFile = e.target.files[0]
 const error = validateFile(uploadedFile)
 
 if (error) {
 setUploadError(error)
 } else {
 setFile(uploadedFile)
 }
 }
 }

 const handleSubmit = async () => {
 if (!file) return
 
 setLoading(true)
 setResult(null)
 setUploadError("")
 
 try {
 console.log("Starting file analysis...")
 
 // Extract text from file
 console.log("Extracting text from file...")
 const resumeText = await extractTextFromFile(file)
 
 if (!resumeText || resumeText.length < 100) {
 throw new Error("Resume appears to be empty or too short. Please ensure your resume contains readable text.")
 }
 
 console.log(`Extracted text length: ${resumeText.length}`)
 
 // Check for LinkedIn
 const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-]+\/?/gi
 const linkedinMatches = resumeText.match(linkedinRegex)
 const hasLinkedIn: boolean = !!(linkedinMatches && linkedinMatches.length > 0)
 
 console.log("LinkedIn found:", hasLinkedIn)
 
 // Analyze with OpenAI
 console.log("Sending to OpenAI for analysis...")
 const analysis = await analyzeWithOpenAI(resumeText, hasLinkedIn)
 
 console.log("Analysis completed successfully")
 setResult({
 linkedin_found: hasLinkedIn,
 ...analysis
 })
 
 } catch (err) {
 console.error("Analysis error:", err)
 
 let errorMessage = "Something went wrong analyzing your resume. Please try again."
 
 if (err instanceof Error) {
 if (err.message.includes('OpenAI API key')) {
 errorMessage = "OpenAI API key not configured. Please add your API key to use this feature."
 } else if (err.message.includes('quota') || err.message.includes('billing')) {
 errorMessage = "OpenAI API quota exceeded. Please try again later."
 } else if (err.message.includes('PDF') || err.message.includes('DOCX') || err.message.includes('corrupted')) {
 errorMessage = err.message
 } else if (err.message.includes('defineProperty')) {
 errorMessage = "File processing error. Please try a different PDF file or convert to DOCX."
 } else {
 errorMessage = err.message
 }
 }
 
 setResult({ 
 linkedin_found: false,
 error: errorMessage
 })
 } finally {
 setLoading(false)
 }
 }

 const resetForm = () => {
 setFile(null)
 setResult(null)
 setUploadError("")
 if (fileInputRef.current) {
 fileInputRef.current.value = ""
 }
 }

 const formatFieldName = (key: string): string => {
 return key
 .replace(/_/g, " ")
 .replace(/\b\w/g, l => l.toUpperCase())
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted p-6">
 <div className="max-w-4xl mx-auto space-y-8">
 {/* Header */}
 <div className="text-center space-y-3">
 <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
 <FileText className="w-5 h-5 text-primary" />
 <span className="text-sm font-medium text-primary">AI Resume Analyzer</span>
 </div>
 <h1 className="text-4xl font-bold">Analyze Your Resume</h1>
 <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
 Upload your resume and receive a comprehensive professional analysis with career recommendations and market insights.
 </p>
 </div>



 {/* Upload Form */}
 <Card className="shadow-lg border border-border/50">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Upload className="w-5 h-5 text-primary" />
 Upload Resume
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* File Upload Area */}
 <div
 className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
 dragActive 
 ? 'border-primary bg-primary/5' 
 : file 
 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
 : uploadError
 ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
 : 'border-border hover:border-primary hover:bg-muted/50'
 }`}
 onDragEnter={handleDrag}
 onDragLeave={handleDrag}
 onDragOver={handleDrag}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 >
 <input
 ref={fileInputRef}
 type="file"
 accept=".pdf,.docx"
 onChange={handleFileSelect}
 className="hidden"
 />
 
 {uploadError ? (
 <div className="space-y-3">
 <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
 <div>
 <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Upload Error</h3>
 <p className="text-red-600 dark:text-red-400">{uploadError}</p>
 <Button variant="outline" size="sm" onClick={resetForm} className="mt-2">
 Try Again
 </Button>
 </div>
 </div>
 ) : file ? (
 <div className="space-y-3">
 <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
 <div>
 <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">File Ready!</h3>
 <p className="text-foreground font-medium">{file.name}</p>
 <p className="text-muted-foreground text-sm">
 {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.includes('pdf') ? 'PDF' : 'DOCX'}
 </p>
 <Button variant="ghost" size="sm" onClick={resetForm} className="mt-2">
 Choose Different File
 </Button>
 </div>
 </div>
 ) : (
 <div className="space-y-3">
 <Upload className={`w-12 h-12 mx-auto transition-colors duration-300 ${
 dragActive ? 'text-primary' : 'text-muted-foreground'
 }`} />
 <div>
 <h3 className="text-lg font-semibold">
 {dragActive ? 'Drop your resume here!' : 'Upload Your Resume'}
 </h3>
 <p className="text-muted-foreground">
 Drag & drop your resume or click to browse
 </p>
 <p className="text-muted-foreground text-sm mt-1">
 Supports PDF and DOCX files up to 10MB
 </p>
 </div>
 </div>
 )}
 </div>

 <Button 
 className="w-full" 
 size="lg" 
 disabled={loading || !file || !!uploadError} 
 onClick={handleSubmit}
 >
 {loading ? (
 <>
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 Analyzing Resume...
 </>
 ) : (
 <>
 <FileText className="w-4 h-4 mr-2" />
 Generate Professional Analysis
 </>
 )}
 </Button>
 </CardContent>
 </Card>

 {/* Results Section */}
 {result && (
 <Card className="shadow-xl bg-card/80 backdrop-blur-sm border border-border/50">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 justify-between">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-primary" />
 Professional Analysis
 </div>
 {result.linkedin_found ? (
 <span className="text-sm font-normal text-green-600 dark:text-green-400 flex items-center gap-1">
 <CheckCircle className="w-4 h-4" />
 LinkedIn Enhanced
 </span>
 ) : (
 <span className="text-sm font-normal text-orange-600 dark:text-orange-400 flex items-center gap-1">
 <AlertCircle className="w-4 h-4" />
 Resume Only
 </span>
 )}
 </CardTitle>
 </CardHeader>
 <CardContent>
 {result.error ? (
 <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
 <div className="flex items-center gap-2">
 <AlertCircle className="w-5 h-5 text-red-500" />
 <p className="text-red-600 dark:text-red-400 font-medium">Analysis Error</p>
 </div>
 <p className="text-red-600 dark:text-red-400 mt-2">{result.error}</p>
 <Button variant="outline" onClick={resetForm} className="mt-4">
 Try Another Resume
 </Button>
 </div>
 ) : (
 <div className="grid gap-6">
 {Object.entries(result)
 .filter(([key]) => key !== 'linkedin_found' && key !== 'error')
 .map(([key, value]) => (
 <div key={key} className="p-6 rounded-lg border bg-muted/40 hover:bg-muted/60 transition-colors">
 <h3 className="font-semibold text-lg mb-3 text-primary">
 {formatFieldName(key)}
 </h3>
 <div className="text-foreground whitespace-pre-line leading-relaxed">
 {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
 </div>
 </div>
 ))}
 
 {/* Action Buttons */}
 <div className="flex gap-4 pt-4 border-t">
 <Button onClick={resetForm} variant="outline">
 Analyze Another Resume
 </Button>
 <Button 
 onClick={() => window.print()} 
 variant="secondary"
 >
 Print Analysis
 </Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </div>
 </div>
 )
}