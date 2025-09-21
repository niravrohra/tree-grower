import { NextResponse } from "next/server"
import OpenAI from "openai"
import pdf from "pdf-parse"
import mammoth from "mammoth"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Rate limiting - simple in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_REQUESTS = 10 // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function getRateLimitKey(req: Request): string {
  // In production, use proper IP detection
  return req.headers.get('x-forwarded-for') || 'anonymous'
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (record.count >= RATE_LIMIT_REQUESTS) {
    return false
  }
  
  record.count++
  return true
}

function validateLinkedInUrl(url: string): boolean {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return urlObj.hostname === 'linkedin.com' || urlObj.hostname === 'www.linkedin.com'
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  console.log("Resume analysis API called")
  
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(req)
    if (!checkRateLimit(rateLimitKey)) {
      console.log("Rate limit exceeded for key:", rateLimitKey)
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("resume") as File

    if (!file) {
      console.log("No file provided in request")
      return NextResponse.json({ error: "Resume file is required" }, { status: 400 })
    }

    console.log(`Received file: ${file.name}, type: ${file.type}, size: ${file.size}`)

    // File validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      console.log("File size too large:", file.size)
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB." },
        { status: 400 }
      )
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')
    const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                   file.name.toLowerCase().endsWith('.docx')
    
    if (!isPdf && !isDocx) {
      console.log("Unsupported file type:", file.type)
      return NextResponse.json(
        { error: "Unsupported file format. Please upload PDF or DOCX only." },
        { status: 400 }
      )
    }

    // Extract text
    let resumeText = ""
    try {
      console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)
      
      if (isPdf) {
        console.log("Processing as PDF...")
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const parsed = await pdf(buffer)
        resumeText = parsed.text.trim()
        console.log(`Extracted text length: ${resumeText.length}`)
      } else if (isDocx) {
        console.log("Processing as DOCX...")
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        resumeText = result.value.trim()
        console.log(`Extracted text length: ${resumeText.length}`)
      }
    } catch (extractionError) {
      console.error("File extraction error details:", {
        error: extractionError,
        message: extractionError instanceof Error ? extractionError.message : 'Unknown error',
        stack: extractionError instanceof Error ? extractionError.stack : 'No stack trace',
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })
      return NextResponse.json(
        { 
          error: "Could not extract text from file. The file may be corrupted or password-protected.",
          details: extractionError instanceof Error ? extractionError.message : 'Unknown extraction error'
        },
        { status: 400 }
      )
    }

    if (!resumeText || resumeText.length < 100) {
      console.log("Resume text too short or empty. Length:", resumeText.length)
      return NextResponse.json(
        { error: "Resume appears to be empty or too short. Please ensure your resume contains readable text." },
        { status: 400 }
      )
    }

    // Enhanced LinkedIn detection with validation
    const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-]+\/?/gi
    const linkedinMatches = resumeText.match(linkedinRegex)
    let hasLinkedIn = false
    let linkedinUrl = null

    if (linkedinMatches && linkedinMatches.length > 0) {
      console.log("Found LinkedIn URLs:", linkedinMatches)
      const validLinkedInUrl = linkedinMatches.find(url => validateLinkedInUrl(url))
      if (validLinkedInUrl) {
        hasLinkedIn = true
        linkedinUrl = validLinkedInUrl.startsWith('http') ? validLinkedInUrl : `https://${validLinkedInUrl}`
        console.log("Valid LinkedIn URL:", linkedinUrl)
      }
    }

    // Enhanced analysis prompt
    const basePrompt = `You are an expert career consultant and resume analyzer with 20+ years of experience in talent acquisition and career development.`
    
    const analysisPrompt = hasLinkedIn
      ? `${basePrompt}

Analyze this resume and consider the associated LinkedIn profile for enhanced insights.

RESUME CONTENT:
${resumeText}

LINKEDIN PROFILE: ${linkedinUrl}

Provide a comprehensive analysis in JSON format with these exact fields:
- professional_summary: A 2-3 sentence executive summary of this candidate's profile
- core_competencies: List of 5-8 key skills and areas of expertise
- career_progression: Analysis of career trajectory, growth patterns, and logical progression
- achievements_quantified: Specific accomplishments with numbers, percentages, or measurable impact
- industry_positioning: How this candidate positions within their industry/field
- leadership_experience: Examples of leadership, management, or team collaboration
- technical_skills: Relevant technical competencies, tools, software, or methodologies
- education_credentials: Educational background and any relevant certifications
- networking_strength: Assessment of professional network and online presence based on LinkedIn
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

    // Call OpenAI with retry logic
    let attempts = 0
    const maxAttempts = 3
    let analysis = {}

    while (attempts < maxAttempts) {
      try {
        console.log(`OpenAI API attempt ${attempts + 1}...`)
        
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: analysisPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.3, // More consistent responses
          max_tokens: 4000, // Ensure adequate response length
        })

        const rawContent = completion.choices[0]?.message?.content
        console.log("OpenAI raw response length:", rawContent?.length)
        console.log("OpenAI raw response preview:", rawContent?.substring(0, 200) + "...")
        
        if (!rawContent) {
          throw new Error("Empty response from OpenAI")
        }

        analysis = JSON.parse(rawContent)
        console.log("Successfully parsed OpenAI response")
        console.log("Analysis keys:", Object.keys(analysis))
        break // Success, exit retry loop
        
      } catch (error) {
        attempts++
        console.error(`OpenAI API attempt ${attempts} failed:`, {
          error: error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          attempt: attempts,
          maxAttempts: maxAttempts
        })
        
        if (attempts >= maxAttempts) {
          return NextResponse.json(
            { 
              error: "AI analysis service is temporarily unavailable. Please try again in a few minutes.",
              details: error instanceof Error ? error.message : 'Unknown OpenAI error'
            },
            { status: 503 }
          )
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
      }
    }

    // Validate response structure
    const requiredFields = hasLinkedIn 
      ? ['professional_summary', 'career_recommendations', 'improvement_areas']
      : ['professional_summary', 'career_recommendations', 'improvement_areas', 'online_presence_recommendation']
    
    const missingFields = requiredFields.filter(field => !analysis[field as keyof typeof analysis])
    if (missingFields.length > 0) {
      console.warn(`Missing fields in AI response: ${missingFields.join(', ')}`)
    }

    console.log("Successfully completed analysis")
    return NextResponse.json({
      success: true,
      linkedin_found: hasLinkedIn,
      linkedin_url: linkedinUrl,
      analysis_timestamp: new Date().toISOString(),
      ...analysis,
    })

  } catch (error) {
    console.error("Main error handler - Full error details:", {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type',
      cause: error instanceof Error ? error.cause : 'No cause',
      timestamp: new Date().toISOString()
    })
    
    // More specific error messages
    if (error instanceof Error) {
      console.log("Error is instanceof Error, checking message content...")
      
      if (error.message.includes('API key')) {
        console.log("API key error detected")
        return NextResponse.json(
          { 
            error: "Service configuration error. Please contact support.",
            details: error.message
          },
          { status: 500 }
        )
      }
      if (error.message.includes('quota')) {
        console.log("Quota error detected")
        return NextResponse.json(
          { 
            error: "Service temporarily at capacity. Please try again later.",
            details: error.message
          },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: "An unexpected error occurred. Please try again.",
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}