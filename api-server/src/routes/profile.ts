import { Router, type IRouter } from "express";
import { eq, and, avg, count } from "drizzle-orm";
import { db, usersTable, profilesTable, portfolioItemsTable, contractsTable, reviewsTable, projectsTable, escrowAccountsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

import { saveBase64File } from "../lib/upload";

// GET /profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.userId!),
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let profile = await db.query.profilesTable.findFirst({
      where: eq(profilesTable.userId, req.userId!),
    });

    if (!profile) {
      // Auto-create profile if missing
      const defaultProfile = {
        userId: req.userId!,
        username: `user_${req.userId!}_${Math.random().toString(36).substring(2, 8)}`,
        twoFactorEnabled: false,
        privacySettings: {},
        notificationPreferences: { emailAlerts: true, pushAlerts: true },
        documentVerificationStatus: "pending",
      };
      await db.insert(profilesTable).values(defaultProfile);
      
      profile = await db.query.profilesTable.findFirst({
        where: eq(profilesTable.userId, req.userId!),
      });
    }

    const portfolio = await db.query.portfolioItemsTable.findMany({
      where: eq(portfolioItemsTable.userId, req.userId!),
    });

    // Merge user & profile and append portfolio list
    const { passwordHash: _p, ...safeUser } = user;
    res.json({
      ...safeUser,
      profileDetails: profile,
      portfolio,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const {
      name,
      hourlyRate,
      skills,
      bio,
      country,
      profileDetails,
      portfolio,
    } = req.body;

    // 1. Update user main record
    await db.update(usersTable)
      .set({
        name: name !== undefined ? name : user.name,
        bio: bio !== undefined ? bio : user.bio,
        skills: skills !== undefined ? (Array.isArray(skills) ? skills.join(", ") : skills) : user.skills,
        hourlyRate: hourlyRate !== undefined ? (hourlyRate ? String(hourlyRate) : null) : user.hourlyRate,
        country: country !== undefined ? country : user.country,
      })
      .where(eq(usersTable.id, req.userId!));

    // 2. Update profile table
    if (profileDetails) {
      await db.update(profilesTable)
        .set({
          username: profileDetails.username,
          mobileNumber: profileDetails.mobileNumber,
          state: profileDetails.state,
          city: profileDetails.city,
          address: profileDetails.address,
          postalCode: profileDetails.postalCode,
          timeZone: profileDetails.timeZone,
          preferredLanguage: profileDetails.preferredLanguage,
          twoFactorEnabled: profileDetails.twoFactorEnabled,
          privacySettings: profileDetails.privacySettings,
          notificationPreferences: profileDetails.notificationPreferences,
          experience: profileDetails.experience,
          education: profileDetails.education,
          certifications: profileDetails.certifications,
          languages: profileDetails.languages,
          minProjectBudget: profileDetails.minProjectBudget ? String(profileDetails.minProjectBudget) : null,
          availability: profileDetails.availability,
          resumeUrl: profileDetails.resumeUrl,
          githubUrl: profileDetails.githubUrl,
          linkedinUrl: profileDetails.linkedinUrl,
          behanceUrl: profileDetails.behanceUrl,
          dribbbleUrl: profileDetails.dribbbleUrl,
          personalWebsite: profileDetails.personalWebsite,
          portfolioWebsite: profileDetails.portfolioWebsite,
          companyName: profileDetails.companyName,
          companyLogoUrl: profileDetails.companyLogoUrl,
          industry: profileDetails.industry,
          businessType: profileDetails.businessType,
          gstNumber: profileDetails.gstNumber,
          companyWebsite: profileDetails.companyWebsite,
          companyDescription: profileDetails.companyDescription,
          employeesCount: profileDetails.employeesCount !== undefined ? profileDetails.employeesCount : null,
          annualProjectBudget: profileDetails.annualProjectBudget ? String(profileDetails.annualProjectBudget) : null,
          panUrl: profileDetails.panUrl,
          aadhaarUrl: profileDetails.aadhaarUrl,
          passportUrl: profileDetails.passportUrl,
          gstDocUrl: profileDetails.gstDocUrl,
          documentVerificationStatus: profileDetails.documentVerificationStatus || "pending",
          updatedAt: new Date(),
        })
        .where(eq(profilesTable.userId, req.userId!));
    }

    // 3. Update Portfolio if supplied
    if (portfolio && Array.isArray(portfolio)) {
      await db.transaction(async (tx) => {
        // Clear old portfolio
        await tx.delete(portfolioItemsTable).where(eq(portfolioItemsTable.userId, req.userId!));
        
        // Insert new ones
        if (portfolio.length > 0) {
          await tx.insert(portfolioItemsTable).values(
            portfolio.map((item: any) => ({
              userId: req.userId!,
              title: item.title,
              description: item.description || null,
              mediaUrl: item.mediaUrl || null,
              mediaType: item.mediaType || "image",
              technologies: item.technologies || null,
              liveUrl: item.liveUrl || null,
              sourceUrl: item.sourceUrl || null,
            }))
          );
        }
      });
    }

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /profile/photo
router.post("/profile/photo", requireAuth, async (req, res) => {
  try {
    const { photo, filename } = req.body;
    if (!photo) {
      res.status(400).json({ error: "Photo data is required" });
      return;
    }

    const fileUrl = saveBase64File(photo, filename || "avatar.png");
    
    await db.update(usersTable)
      .set({ avatarUrl: fileUrl })
      .where(eq(usersTable.id, req.userId!));

    res.json({ success: true, url: fileUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /profile/photo
router.delete("/profile/photo", requireAuth, async (req, res) => {
  try {
    await db.update(usersTable)
      .set({ avatarUrl: null })
      .where(eq(usersTable.id, req.userId!));

    res.json({ success: true, message: "Profile photo removed successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /profile/upload (Generic upload for documents/resumes/portfolio)
router.post("/profile/upload", requireAuth, async (req, res) => {
  try {
    const { file, filename } = req.body;
    if (!file || !filename) {
      res.status(400).json({ error: "File data and filename are required" });
      return;
    }

    const fileUrl = saveBase64File(file, filename);
    res.json({ success: true, url: fileUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /profile/stats
router.get("/profile/stats", requireAuth, async (req, res) => {
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const role = user.role;

    if (role === "freelancer") {
      // 1. Completed projects count
      const [completedResult] = await db
        .select({ value: count() })
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.freelancerId, req.userId!),
            eq(projectsTable.status, "completed")
          )
        );
      
      // 2. Active projects count
      const [activeResult] = await db
        .select({ value: count() })
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.freelancerId, req.userId!),
            eq(projectsTable.status, "active")
          )
        );

      // 3. Reviews stats
      const [reviewsResult] = await db
        .select({ count: count(), avg: avg(reviewsTable.rating) })
        .from(reviewsTable)
        .where(eq(reviewsTable.revieweeId, req.userId!));

      // 4. Escrow protected funds
      const escrows = await db
        .select({ total: escrowAccountsTable.totalAmount, released: escrowAccountsTable.releasedAmount, refunded: escrowAccountsTable.refundedAmount })
        .from(escrowAccountsTable)
        .where(eq(escrowAccountsTable.freelancerId, req.userId!));

      const escrowBalance = escrows.reduce((sum, esc) => {
        const remaining = Number(esc.total) - Number(esc.released) - Number(esc.refunded);
        return sum + (remaining > 0 ? remaining : 0);
      }, 0);

      res.json({
        role: "freelancer",
        jobsCompleted: completedResult?.value ?? 0,
        activeProjects: activeResult?.value ?? 0,
        earnings: Number(user.totalEarned || 0),
        escrowBalance: escrowBalance,
        totalReviews: reviewsResult?.count ?? 0,
        rating: Number(reviewsResult?.avg || 0).toFixed(1),
        successRate: "98%", // mock representation
        responseTime: "1 hour",
        repeatClients: 0,
      });

    } else {
      // Client stats
      // 1. Posted projects count
      const [postedResult] = await db
        .select({ value: count() })
        .from(projectsTable)
        .where(eq(projectsTable.clientId, req.userId!));
      
      // 2. Active projects count
      const [activeResult] = await db
        .select({ value: count() })
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.clientId, req.userId!),
            eq(projectsTable.status, "active")
          )
        );

      // 3. Reviews received
      const [reviewsResult] = await db
        .select({ count: count(), avg: avg(reviewsTable.rating) })
        .from(reviewsTable)
        .where(eq(reviewsTable.revieweeId, req.userId!));

      // 4. Escrow protected funds
      const escrows = await db
        .select({ total: escrowAccountsTable.totalAmount, released: escrowAccountsTable.releasedAmount, refunded: escrowAccountsTable.refundedAmount })
        .from(escrowAccountsTable)
        .where(eq(escrowAccountsTable.clientId, req.userId!));

      const escrowBalance = escrows.reduce((sum, esc) => {
        const remaining = Number(esc.total) - Number(esc.released) - Number(esc.refunded);
        return sum + (remaining > 0 ? remaining : 0);
      }, 0);

      res.json({
        role: "client",
        projectsPosted: postedResult?.value ?? 0,
        activeProjects: activeResult?.value ?? 0,
        totalSpending: Number(user.totalSpent || 0),
        escrowBalance: escrowBalance,
        paymentSuccess: "100%",
        reviewsReceived: reviewsResult?.count ?? 0,
        averageRating: Number(reviewsResult?.avg || 0).toFixed(1),
      });
    }

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
