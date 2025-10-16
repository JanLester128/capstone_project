<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserSession;
use Illuminate\Support\Facades\Log;

class CleanupExpiredSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired user sessions';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting session cleanup...');

        try {
            $expiredCount = UserSession::cleanupExpiredSessions();
            
            $this->info("Successfully cleaned up {$expiredCount} expired sessions.");
            
            Log::info('Session cleanup completed', [
                'expired_sessions_count' => $expiredCount,
                'executed_at' => now()
            ]);
            
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Session cleanup failed: ' . $e->getMessage());
            
            Log::error('Session cleanup failed', [
                'error' => $e->getMessage(),
                'executed_at' => now()
            ]);
            
            return Command::FAILURE;
        }
    }
}
