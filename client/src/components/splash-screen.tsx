import { motion } from "framer-motion";
import { Vote } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SystemSettings } from "@shared/schema";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { data: systemSettings } = useQuery<{systemSettings: SystemSettings}>({
    queryKey: ["/api/candidates"],
  });

  useEffect(() => {
    // Show splash screen for 3 seconds
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-primary flex items-center justify-center flex-col gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
      >
        {systemSettings?.systemSettings?.splashLogoUrl ? (
          <img 
            src={systemSettings.systemSettings.splashLogoUrl} 
            alt="ARSC Logo"
            className="w-32 h-32 object-contain"
          />
        ) : (
          <Vote className="w-32 h-32 text-white" />
        )}
      </motion.div>
      <motion.h1
        className="text-4xl font-bold text-white"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        ARSC Voting System
      </motion.h1>
      <motion.div
        className="w-48 h-1 bg-white/20 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.div
          className="h-full bg-white"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </motion.div>
    </motion.div>
  );
}