<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Faculty extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'registrar_id'];

    public function registrar()
    {
        return $this->belongsTo(Registrar::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }
}
