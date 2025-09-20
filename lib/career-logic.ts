import type { UserProfile, PathNode, Resource } from "@/types/career-types"

export async function generateInitialSuggestions(profile: UserProfile): Promise<PathNode> {
  const interests = profile.interests.join(", ")

  try {
    const suggestions = await generateAISuggestions({
      userProfile: profile,
      context: "initial career exploration",
      currentPath: `${profile.currentSituation} interested in ${interests}`,
    })

    return {
      id: "root",
      title: `${profile.currentSituation} interested in ${interests}`,
      description: `Let's explore career paths based on your interests and background`,
      options: suggestions,
      resources: generateInitialResources(profile),
      level: 0,
    }
  } catch (error) {
    console.error("Error generating AI suggestions:", error)
    // Fallback to default suggestions
    return {
      id: "root",
      title: `${profile.currentSituation} interested in ${interests}`,
      description: `Let's explore career paths based on your interests and background`,
      options: [
        "Continue Education (College/University)",
        "Start Working (Entry-level jobs)",
        "Learn New Skills (Online courses/Bootcamps)",
        "Start a Business/Startup",
        "Explore Internships",
        "Join the Military",
        "Take a Gap Year to Explore",
      ],
      resources: generateInitialResources(profile),
      level: 0,
    }
  }
}

export async function generateNodeSuggestions(
  node: PathNode,
  userProfile: UserProfile,
  pathHistory: PathNode[],
): Promise<PathNode> {
  try {
    const pathContext = pathHistory.map((n) => n.title).join(" → ")

    const suggestions = await generateAISuggestions({
      userProfile,
      context: `continuing from: ${pathContext}`,
      currentPath: node.title,
    })

    const resources = await generateAIResources({
      userProfile,
      currentChoice: node.title,
      pathHistory,
    })

    return {
      ...node,
      options: suggestions,
      resources,
    }
  } catch (error) {
    console.error("Error generating node suggestions:", error)
    // Fallback to default options
    return {
      ...node,
      options: generateNextOptions(node),
      resources: generateContextualResources(node, userProfile),
    }
  }
}

async function generateAISuggestions({
  userProfile,
  context,
  currentPath,
}: {
  userProfile: UserProfile
  context: string
  currentPath: string
}): Promise<string[]> {
  const prompt = `
You are a career counselor helping someone explore their career path. 

User Profile:
- Current Situation: ${userProfile.currentSituation}
- Interests: ${userProfile.interests.join(", ")}
- Experience: ${userProfile.experience}
- Goals: ${userProfile.goals}

Context: ${context}
Current Path: ${currentPath}

Generate 6-8 specific, actionable next steps for this person's career journey. Each suggestion should be:
1. Specific and actionable
2. Relevant to their background and interests
3. Progressive (building on their current path)
4. Diverse (covering different approaches)

Format as a simple list, one suggestion per line, no numbering or bullets.
`

  // Mock Gemini API call - replace with actual API integration
  const response = await mockGeminiAPI(prompt)

  return response
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .slice(0, 8)
}

async function generateAIResources({
  userProfile,
  currentChoice,
  pathHistory,
}: {
  userProfile: UserProfile
  currentChoice: string
  pathHistory: PathNode[]
}): Promise<Resource[]> {
  const prompt = `
Generate 3-5 specific resources to help someone who chose: "${currentChoice}"

User background: ${userProfile.currentSituation}, interested in ${userProfile.interests.join(", ")}

For each resource, provide:
- Title
- Brief description
- Type (website, course, book, video, tool)
- Difficulty level (beginner, intermediate, advanced)
- Time commitment

Format as JSON array.
`

  try {
    const response = await mockGeminiAPI(prompt)
    const resources = JSON.parse(response)

    return resources.map((r: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      title: r.title,
      description: r.description,
      type: r.type,
      url: r.url || "#",
      difficulty: r.difficulty,
      duration: r.duration,
    }))
  } catch (error) {
    console.error("Error parsing AI resources:", error)
    return generateContextualResources({ title: currentChoice } as PathNode, userProfile)
  }
}

async function mockGeminiAPI(prompt: string): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock responses based on prompt content
  if (prompt.includes("initial career exploration")) {
    return `Research specific degree programs in your field of interest
Apply to universities with strong programs in your area
Look for internships in companies you admire
Start building a portfolio of your work
Network with professionals in your field
Consider gap year programs for real-world experience
Explore online courses to test your interests
Join student organizations related to your field`
  }

  if (prompt.includes("Continue Education")) {
    return `Research universities with strong programs in your field
Visit college campuses and attend information sessions
Apply for scholarships and financial aid
Consider community college for general education requirements
Look into honors programs and special opportunities
Connect with current students in your field of interest
Prepare for standardized tests if required
Create a timeline for application deadlines`
  }

  // Default response
  return `Take online courses to build relevant skills
Network with professionals in your chosen field
Gain hands-on experience through projects or volunteering
Research industry trends and requirements
Build a professional online presence
Seek mentorship from experienced professionals
Set specific short-term and long-term goals
Create a portfolio showcasing your abilities`
}

export function generateNextOptions(node: PathNode): string[] {
  // Generate contextual options based on the current node
  const baseOptions = {
    "Continue Education": [
      "Choose a Major/Field of Study",
      "Research Universities",
      "Apply for Scholarships",
      "Consider Community College First",
      "Look into Trade Schools",
    ],
    "Start Working": [
      "Create a Resume",
      "Search for Entry-level Positions",
      "Network with Professionals",
      "Consider Temporary/Contract Work",
      "Look into Apprenticeships",
    ],
    "Learn New Skills": [
      "Choose Online Learning Platform",
      "Find Coding Bootcamps",
      "Get Professional Certifications",
      "Join Skill-based Communities",
      "Find a Mentor",
    ],
    "Start a Business": [
      "Develop Business Idea",
      "Create Business Plan",
      "Find Co-founders",
      "Seek Funding/Investors",
      "Start Small/Side Hustle",
    ],
    "Explore Internships": [
      "Search Internship Programs",
      "Prepare Application Materials",
      "Network with Alumni",
      "Consider Unpaid Experience",
      "Look into Government Programs",
    ],
  }

  // Find matching options based on node title
  for (const [key, options] of Object.entries(baseOptions)) {
    if (node.title.toLowerCase().includes(key.toLowerCase())) {
      return options
    }
  }

  // Default options for deeper levels
  return [
    "Research More Options",
    "Talk to Professionals",
    "Gain Practical Experience",
    "Build a Portfolio",
    "Set Short-term Goals",
  ]
}

function generateInitialResources(profile: UserProfile): Resource[] {
  const resources: Resource[] = [
    {
      id: "1",
      title: "Career Assessment Quiz",
      description: "Discover careers that match your interests and personality",
      type: "website",
      url: "https://www.mynextmove.org/explore/ip",
      difficulty: "beginner",
      duration: "15 minutes",
    },
    {
      id: "2",
      title: "LinkedIn Learning Career Courses",
      description: "Professional development courses for career planning",
      type: "course",
      url: "https://www.linkedin.com/learning/",
      difficulty: "beginner",
      duration: "1-3 hours",
    },
    {
      id: "3",
      title: "Coursera Career Certificates",
      description: "Industry-recognized certificates from top companies",
      type: "course",
      url: "https://www.coursera.org/certificates",
      difficulty: "intermediate",
      duration: "3-6 months",
    },
  ]

  // Add interest-specific resources
  profile.interests.forEach((interest) => {
    if (interest.toLowerCase().includes("tech") || interest.toLowerCase().includes("programming")) {
      resources.push({
        id: `tech-${Date.now()}`,
        title: "FreeCodeCamp",
        description: "Learn to code for free with hands-on projects",
        type: "website",
        url: "https://www.freecodecamp.org/",
        difficulty: "beginner",
        duration: "Self-paced",
      })
    }

    if (interest.toLowerCase().includes("design") || interest.toLowerCase().includes("art")) {
      resources.push({
        id: `design-${Date.now()}`,
        title: "Adobe Creative Suite Tutorials",
        description: "Master design tools used by professionals",
        type: "video",
        url: "https://helpx.adobe.com/creative-suite.html",
        difficulty: "beginner",
        duration: "2-4 hours",
      })
    }
  })

  return resources
}

function generateContextualResources(node: PathNode, profile: UserProfile): Resource[] {
  const resources: Resource[] = [
    {
      id: "1",
      title: "Career Assessment Quiz",
      description: "Discover careers that match your interests and personality",
      type: "website",
      url: "https://www.mynextmove.org/explore/ip",
      difficulty: "beginner",
      duration: "15 minutes",
    },
    {
      id: "2",
      title: "LinkedIn Learning Career Courses",
      description: "Professional development courses for career planning",
      type: "course",
      url: "https://www.linkedin.com/learning/",
      difficulty: "beginner",
      duration: "1-3 hours",
    },
  ]

  return resources
}
